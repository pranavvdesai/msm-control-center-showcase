// Showcase seed: every record is synthetic (fictional students, subjects, faculty, leaves and visits).
import { PrismaClient, type Subject } from "@prisma/client";
import bcrypt from "bcryptjs";
import { COHORT_PASSWORD, COHORT_STUDENTS } from "../src/lib/students";
import { CR_FULL_NAME, CR_PHONE } from "../src/lib/cohort";
import { getIstDateString } from "../src/lib/play/ist-date";
import { generateDailySudoku } from "../src/lib/sudoku/generator";

const prisma = new PrismaClient();

let rngState = 20261013;
function rand() {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296;
  return rngState / 4294967296;
}
const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)];

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istKey(date: Date) {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}
function istNoon(key: string) {
  return new Date(`${key}T12:00:00+05:30`);
}
function istWeekday(key: string) {
  return new Date(`${key}T12:00:00Z`).getUTCDay();
}

const SUBJECTS = [
  { code: "DEMO-BM", name: "Brand Management", credits: 3, faculty: "Demo Faculty A" },
  { code: "DEMO-DMA", name: "Digital Marketing Analytics", credits: 3, faculty: "Demo Faculty B" },
  { code: "DEMO-PS", name: "Pricing Strategy", credits: 2, faculty: "Demo Faculty C" },
  { code: "DEMO-B2B", name: "B2B Marketing", credits: 2, faculty: "Demo Faculty D" },
  { code: "DEMO-SFM", name: "Sales Force Management", credits: 2, faculty: "Demo Faculty E" },
  { code: "DEMO-RM", name: "Retail Management", credits: 3, faculty: "Demo Faculty F" },
  { code: "DEMO-CBL", name: "Consumer Behaviour Lab", credits: 1, faculty: "Demo Faculty G" },
];

const SLOTS = [
  { startTime: "08:45 AM", endTime: "10:00 AM" },
  { startTime: "10:15 AM", endTime: "11:30 AM" },
  { startTime: "11:45 AM", endTime: "01:00 PM" },
  { startTime: "02:30 PM", endTime: "03:45 PM" },
  { startTime: "04:00 PM", endTime: "05:15 PM" },
];

const ROOMS = ["LH-1", "LH-2", "LH-4", "Seminar Hall", "Case Room 3"];

async function main() {
  const passwordHash = await bcrypt.hash(COHORT_PASSWORD, 10);
  const now = new Date();
  const todayKey = istKey(now);

  console.log(`Seeding ${COHORT_STUDENTS.length} fictional students...`);
  const users: Array<{ id: string; name: string; rollNumber: string }> = [];
  for (const [index, student] of COHORT_STUDENTS.entries()) {
    const roll = student.rollNumber.toUpperCase();
    const birthdayOffset = index === 4 ? 0 : (index * 37) % 365;
    const birthday = new Date(now.getTime() + birthdayOffset * DAY_MS);
    birthday.setUTCFullYear(2001 + (index % 3));
    const user = await prisma.user.upsert({
      where: { rollNumber: roll },
      update: { name: student.name, passwordHash, role: student.role ?? "STUDENT" },
      create: {
        name: student.name,
        rollNumber: roll,
        email: `${roll.toLowerCase()}@msm.cohort`,
        passwordHash,
        role: student.role ?? "STUDENT",
        birthday: istNoon(istKey(birthday)),
        profileComplete: true,
        welcomeEmailSent: true,
      },
    });
    users.push({ id: user.id, name: user.name, rollNumber: user.rollNumber });
  }

  await prisma.appSettings.upsert({
    where: { id: 1 },
    update: { crName: CR_FULL_NAME, crPhone: CR_PHONE },
    create: {
      crName: CR_FULL_NAME,
      crPhone: CR_PHONE,
      cohortName: "MSM",
      cohortFull: "Marketing and Sales Management",
      termInfo: "Term 5 · Demo data",
    },
  });

  const subjects: Subject[] = [];
  for (const s of SUBJECTS) {
    subjects.push(
      await prisma.subject.upsert({ where: { code: s.code }, update: s, create: s })
    );
  }

  if ((await prisma.timetableEntry.count()) === 0) {
    console.log("Building timetable...");
    const entries: Array<{ date: Date; startTime: string; endTime: string; room: string; faculty: string; subjectId: string }> = [];
    for (let offset = -35; offset <= 120; offset++) {
      const key = istKey(new Date(now.getTime() + offset * DAY_MS));
      const weekday = istWeekday(key);
      if (weekday === 0) continue;
      const slotCount = weekday === 6 ? 2 : 4;
      const daySubjects = [...subjects].sort(() => rand() - 0.5).slice(0, slotCount);
      daySubjects.forEach((subject, i) => {
        const slot = SLOTS[i + (weekday % 2)];
        entries.push({
          date: istNoon(key),
          startTime: slot.startTime,
          endTime: slot.endTime,
          room: pick(ROOMS),
          faculty: subject.faculty ?? "Demo Faculty",
          subjectId: subject.id,
        });
      });
    }
    for (const entry of entries) await prisma.timetableEntry.create({ data: entry });
  }

  if ((await prisma.leave.count()) === 0) {
    console.log("Recording leaves...");
    const pastEntries = await prisma.timetableEntry.findMany({
      where: { date: { lt: istNoon(todayKey) } },
      include: { subject: true },
      orderBy: { date: "asc" },
    });
    const bySubject = new Map<string, typeof pastEntries>();
    for (const e of pastEntries) {
      bySubject.set(e.subjectId, [...(bySubject.get(e.subjectId) ?? []), e]);
    }

    const plan = (userId: string, code: string, types: Array<"REGULAR" | "CONDONED" | "LATE">) => {
      const subject = subjects.find((s) => s.code === code)!;
      const pool = [...(bySubject.get(subject.id) ?? [])].sort(() => rand() - 0.5);
      return types.slice(0, pool.length).map((type, i) => ({
        userId,
        subjectId: subject.id,
        timetableEntryId: pool[i].id,
        date: pool[i].date,
        type,
      }));
    };

    const ram = users.find((u) => u.rollNumber === "DM136")!;
    const rows = [
      ...plan(ram.id, "DEMO-BM", ["REGULAR"]),
      ...plan(ram.id, "DEMO-PS", ["REGULAR", "CONDONED"]),
      ...plan(ram.id, "DEMO-B2B", ["REGULAR", "REGULAR"]),
      ...plan(ram.id, "DEMO-DMA", ["LATE", "CONDONED"]),
      ...plan(ram.id, "DEMO-RM", ["REGULAR"]),
    ];
    for (const user of users) {
      if (user.id === ram.id) continue;
      for (const subject of SUBJECTS) {
        const count = Math.floor(rand() * (subject.credits + 1));
        const types = Array.from({ length: count }, () =>
          rand() < 0.7 ? ("REGULAR" as const) : rand() < 0.5 ? ("CONDONED" as const) : ("LATE" as const)
        );
        rows.push(...plan(user.id, subject.code, types));
      }
    }
    for (const row of rows) await prisma.leave.create({ data: row });
  }

  if ((await prisma.activityEvent.count()) === 0) {
    const feed = [
      { minutesAgo: 4, type: "login", text: (n: string) => `${n} just entered the MSM Control Center.` },
      { minutesAgo: 11, type: "leave", text: (n: string) => `${n} marked a condoned leave in Retail Management. Looks like life happened.` },
      { minutesAgo: 19, type: "alert", text: (n: string) => `${n} has only 1 leave left in Pricing Strategy.` },
      { minutesAgo: 26, type: "birthday_wish", text: (n: string) => `${n} lit a birthday candle for ${users[4].name} — the cohort glows a little brighter 🎂` },
      { minutesAgo: 34, type: "login", text: (n: string) => `${n} logged in. Attendance anxiety levels recalibrating.` },
      { minutesAgo: 47, type: "leave", text: (n: string) => `${n} took a regular absence in B2B Marketing. The plot thickens.` },
      { minutesAgo: 58, type: "leave", text: (n: string) => `${n} marked late in Digital Marketing Analytics. Faculty noted the entrance drama.` },
      { minutesAgo: 73, type: "alert", text: (n: string) => `${n} has no leaves left in Consumer Behaviour Lab. Subgrade zone unlocked.` },
      { minutesAgo: 95, type: "login", text: (n: string) => `Welcome back, ${n}. Faculty hasn't noticed yet. Probably.` },
      { minutesAgo: 130, type: "birthday_wish", text: (n: string) => `With warmth from MSM, ${n} sends birthday light to ${users[4].name} ✨` },
    ];
    for (const item of feed) {
      const user = pick(users.filter((u) => u.rollNumber !== "DM136"));
      await prisma.activityEvent.create({
        data: {
          userId: user.id,
          message: item.text(user.name),
          type: item.type,
          createdAt: new Date(now.getTime() - item.minutesAgo * 60 * 1000),
        },
      });
    }
  }

  if ((await prisma.pageVisit.count()) === 0) {
    console.log("Generating page visits for analytics...");
    const tabs: Array<[string, string, number]> = [
      ["Home", "/dashboard", 10],
      ["Leave", "/leave", 7],
      ["Timetable", "/timetable", 6],
      ["Play", "/games", 4],
      ["News", "/news", 2],
      ["Cake Radar", "/cake-radar", 2],
      ["About", "/about", 1],
      ["History", "/history", 1],
    ];
    const weighted = tabs.flatMap(([tab, path, w]) => Array.from({ length: w }, () => ({ tab, path })));
    const visits = [];
    for (let day = 13; day >= 0; day--) {
      const visitDate = istKey(new Date(now.getTime() - day * DAY_MS));
      for (const user of users) {
        if (rand() < 0.35) continue;
        const n = 1 + Math.floor(rand() * 5);
        for (let i = 0; i < n; i++) {
          const { tab, path } = pick(weighted);
          visits.push({
            userId: user.id,
            tab,
            path,
            visitDate,
            visitedAt: new Date(`${visitDate}T${String(8 + Math.floor(rand() * 13)).padStart(2, "0")}:${String(Math.floor(rand() * 60)).padStart(2, "0")}:00+05:30`),
          });
        }
      }
    }
    for (const v of visits) await prisma.pageVisit.create({ data: v });
  }

  if ((await prisma.quizUserStats.count()) === 0) {
    for (const user of users) {
      if (rand() < 0.3) continue;
      const completed = 3 + Math.floor(rand() * 18);
      const questions = completed * 5;
      const correct = Math.floor(questions * (0.45 + rand() * 0.5));
      await prisma.quizUserStats.create({
        data: {
          userId: user.id,
          totalCompleted: completed,
          allTimeScore: correct * 20 + completed * 10,
          bestScore: 60 + Math.floor(rand() * 5) * 10,
          totalCorrect: correct,
          totalQuestions: questions,
          currentStreak: Math.floor(rand() * 6),
          longestStreak: 3 + Math.floor(rand() * 9),
        },
      });
      if (rand() < 0.75) {
        const done = 1 + Math.floor(rand() * 14);
        const best = (6 + Math.floor(rand() * 20)) * 60 * 1000;
        await prisma.sudokuUserStats.create({
          data: {
            userId: user.id,
            totalCompleted: done,
            allTimeScore: done * 100 + Math.floor(rand() * 300),
            bestDurationMs: best,
            totalDurationMs: done * (best + Math.floor(rand() * 10 * 60 * 1000)),
            currentStreak: Math.floor(rand() * 4),
            longestStreak: 2 + Math.floor(rand() * 6),
          },
        });
      }
    }
  }

  if ((await prisma.dailySudoku.count()) === 0) {
    for (let offset = -7; offset <= 120; offset++) {
      const puzzleDate = getIstDateString(new Date(now.getTime() + offset * DAY_MS));
      const local = generateDailySudoku(puzzleDate);
      await prisma.dailySudoku.create({
        data: {
          puzzleDate,
          initialGrid: local.initialGrid,
          solution: local.solution,
          difficulty: local.difficulty,
          clueCount: local.clueCount,
          source: "local",
          seed: null,
        },
      });
    }
  }

  console.log("Seed complete!");
  console.log(`Login: roll number DM136 (Ram, admin) or any DM101–DM150 / password: ${COHORT_PASSWORD}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
