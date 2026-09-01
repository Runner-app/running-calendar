import { getMonday, getWeekKey, parseRunDate } from "./RunUtils.js";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MIN_STREAK_LENGTH = 10;

function getDistance(run) {
    return parseFloat(run.distance) || 0;
}

function formatDayMonth(date) {
    return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getSummaryStats(runsWithMetrics = []) {
    const totalRuns = runsWithMetrics.length;

    const totalDistance = runsWithMetrics.reduce(
        (sum, run) => sum + getDistance(run),
        0
    );

    let currentStreak = 0;

    if (runsWithMetrics.length > 0) {
        const latestRun = runsWithMetrics.reduce((latest, run) => {
            if (!latest) return run;

            const latestDate = parseRunDate(
                latest.date,
                latest.time
            );

            const runDate = parseRunDate(
                run.date,
                run.time
            );

            return runDate > latestDate ? run : latest;
        }, null);

        currentStreak = latestRun?.computedStreak || 0;
    }

    return {
        totalRuns,
        totalDistance,
        currentStreak
    };
}


export function getYearlyStats(runsWithMetrics = []) {
    const yearlyMap = {};

    runsWithMetrics.forEach((run) => {
        if (!run.date) return;

        const date = parseRunDate(run.date);
        const year = date.getFullYear();

        if (!yearlyMap[year]) {
            yearlyMap[year] = {
                year,
                totalDistance: 0,
                totalRuns: 0
            };
        }

        yearlyMap[year].totalDistance += getDistance(run);
        yearlyMap[year].totalRuns += 1;
    });

    return Object.values(yearlyMap)
        .sort((a, b) => b.year - a.year);
}


export function getMonthlyStats(runsWithMetrics = []) {
    if (!runsWithMetrics.length) return [];

    const oldestRun = runsWithMetrics.reduce((oldest, run) => {
        if (!run.date) return oldest;
        if (!oldest) return run;

        return run.date < oldest.date ? run : oldest;
    }, null);

    if (!oldestRun) return [];

    const oldestDate = parseRunDate(oldestRun.date);

    const startDate = new Date(
        oldestDate.getFullYear(),
        oldestDate.getMonth(),
        1
    );

    const endDate = new Date();
    const monthlyMap = {};
    let iterDate = new Date(startDate);

    while (iterDate <= endDate) {
        const year = iterDate.getFullYear();
        const month = iterDate.getMonth();
        const monthName = MONTH_NAMES[month];
        const key = `${year}-${month}`;

        monthlyMap[key] = {
            year,
            month,
            monthName,
            key,
            totalDistance: 0,
            runCount: 0
        };

        iterDate.setMonth(iterDate.getMonth() + 1);
    }

    runsWithMetrics.forEach((run) => {
        if (!run.date) return;

        const date = parseRunDate(run.date);
        const year = date.getFullYear();
        const month = date.getMonth();
        const key = `${year}-${month}`;

        if (!monthlyMap[key]) return;

        monthlyMap[key].totalDistance += getDistance(run);
        monthlyMap[key].runCount += 1;
    });

    return Object.values(monthlyMap)
        .sort((a, b) => b.totalDistance - a.totalDistance);
}


export function getTopWeeklyStats(runsWithMetrics = []) {
    if (!runsWithMetrics?.length) return [];

    const weeksMap = {};

    runsWithMetrics.forEach((run) => {
        if (!run.date) return;

        const runDate = parseRunDate(run.date);
        const weekKey = getWeekKey(runDate, runsWithMetrics);

        if (!weeksMap[weekKey]) {
            const monday = getMonday(runDate);

            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);

            const mondayStr = formatDayMonth(monday);
            const sundayStr = formatDayMonth(sunday);
            const yearStr = sunday.getFullYear();

            weeksMap[weekKey] = {
                weekKey,
                dateRangeLabel: `${mondayStr} - ${sundayStr}.${yearStr}`,
                totalDistance: 0,
                runCount: 0
            };
        }

        weeksMap[weekKey].totalDistance += getDistance(run);
        weeksMap[weekKey].runCount += 1;
    });

    return Object.values(weeksMap)
        .sort((a, b) => b.totalDistance - a.totalDistance)
        .slice(0, 20);
}


export function getStreakStats(runsWithMetrics = []) {
    if (!runsWithMetrics?.length) return [];

    const uniqueDates = Array.from(
        new Set(
            runsWithMetrics
                .map((run) => run.date)
                .filter(Boolean)
        )
    ).sort();

    if (!uniqueDates.length) return [];

    const streaks = [];

    let streakStart = uniqueDates[0];
    let streakEnd = uniqueDates[0];
    let count = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = parseRunDate(uniqueDates[i - 1]);
        const currDate = parseRunDate(uniqueDates[i]);

        const diffDays = Math.round(
            (currDate - prevDate) / MS_PER_DAY
        );

        if (diffDays === 1) {
            count++;
            streakEnd = uniqueDates[i];
            continue;
        }

        if (count >= MIN_STREAK_LENGTH) {
            streaks.push({
                count,
                startDate: streakStart,
                endDate: streakEnd,
                isCurrent: false
            });
        }

        count = 1;
        streakStart = uniqueDates[i];
        streakEnd = uniqueDates[i];
    }

    if (count >= MIN_STREAK_LENGTH) {
        const lastRunDate = parseRunDate(
            uniqueDates[uniqueDates.length - 1]
        );

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffToToday = Math.round(
            (today - lastRunDate) / MS_PER_DAY
        );

        streaks.push({
            count,
            startDate: streakStart,
            endDate: diffToToday <= 1 ? null : streakEnd,
            isCurrent: diffToToday <= 1
        });
    }

    return streaks.sort((a, b) => b.count - a.count);
}


export function getMonthlyComparisonStats(
    runsWithMetrics = [],
    currentYear,
    currentMonth
) {
    if (!runsWithMetrics?.length) return [];

    const monthsBase = MONTH_NAMES.map((monthName, monthIndex) => ({
        monthIndex,
        monthName,
        yearsMap: {}
    }));

    runsWithMetrics.forEach((run) => {
        if (!run.date) return;

        const date = parseRunDate(run.date);
        const monthIndex = date.getMonth();
        const year = date.getFullYear();
        const distance = getDistance(run);

        if (!monthsBase[monthIndex].yearsMap[year]) {
            monthsBase[monthIndex].yearsMap[year] = {
                year,
                distance: 0,
                runs: 0
            };
        }

        monthsBase[monthIndex].yearsMap[year].distance += distance;
        monthsBase[monthIndex].yearsMap[year].runs += 1;
    });

    return monthsBase.map((month) => {
        const yearsSorted = Object.values(month.yearsMap)
            .map((yearData) => ({
                ...yearData,
                distance: Math.round(yearData.distance),
                isCurrent:
                    yearData.year === currentYear &&
                    month.monthIndex === currentMonth
            }))
            .sort((a, b) => b.distance - a.distance);

        return {
            monthIndex: month.monthIndex,
            monthName: month.monthName,
            years: yearsSorted
        };
    });
}
