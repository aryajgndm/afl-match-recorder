import jsPDF from 'jspdf';
import { Fixture, MatchEvent, Team } from '../types';
import { getPlayerById, getPlayersByTeam } from '../data/players';
import { TEAMS } from '../data/teams';

export function exportMatchScoresheetPdf(
  fixture: Fixture,
  events: MatchEvent[],
  team1: Team | null,
  team2: Team | null
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const score = fixture.result?.score;

  // Helper font styles
  const setBold = (size = 10) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size);
  };
  const setRegular = (size = 9) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
  };

  // ==========================================
  // PAGE 1: OFFICIAL MATCHDAY RECORD
  // ==========================================
  // Title Header
  setBold(22);
  doc.text('AFL', margin, 24);
  setBold(11);
  doc.text('OFFICIAL', margin + 22, 21);
  doc.text('MATCHDAY', margin + 22, 26);
  doc.text('RECORD', margin + 22, 31);

  // Institution text on right
  setBold(10);
  doc.text('ATRIA INSTITUTE OF TECHNOLOGY', pageWidth - margin, 22, { align: 'right' });
  setRegular(8);
  doc.text('AFL POSTSEASON 2026', pageWidth - margin, 27, { align: 'right' });

  // Date, Day, Kickoff Blocks
  let y = 44;
  setBold(9);
  doc.text('DATE', margin, y);
  doc.text('SERIES / GAME', margin + 65, y);
  doc.text('STATUS', pageWidth - margin - 35, y);

  y += 3;
  setRegular(9);
  doc.rect(margin, y, 55, 8);
  doc.text(fixture.date || 'November 2026', margin + 4, y + 5.5);

  doc.rect(margin + 65, y, 65, 8);
  doc.text(
    `${fixture.seriesId.toUpperCase()} • GAME ${fixture.gameNumber} (${fixture.phase.toUpperCase()})`,
    margin + 69,
    y + 5.5
  );

  doc.rect(pageWidth - margin - 35, y, 35, 8);
  doc.text('COMPLETED', pageWidth - margin - 32, y + 5.5);

  // Scores breakdown table: BIBS / KITS
  y += 18;
  const tableX = margin;
  const colW_Team = 60;
  const colW_Q = (contentWidth - colW_Team) / 6;

  // Header row
  doc.setFillColor(240, 240, 240);
  doc.rect(tableX, y, contentWidth, 8, 'F');
  doc.rect(tableX, y, contentWidth, 8, 'S');

  setBold(9);
  doc.text('TEAMS', tableX + 4, y + 5.5);
  doc.text('Q1', tableX + colW_Team + colW_Q * 0.5, y + 5.5, { align: 'center' });
  doc.text('Q2', tableX + colW_Team + colW_Q * 1.5, y + 5.5, { align: 'center' });
  doc.text('Q3', tableX + colW_Team + colW_Q * 2.5, y + 5.5, { align: 'center' });
  doc.text('Q4', tableX + colW_Team + colW_Q * 3.5, y + 5.5, { align: 'center' });
  doc.text('ET*', tableX + colW_Team + colW_Q * 4.5, y + 5.5, { align: 'center' });
  doc.text('FT', tableX + colW_Team + colW_Q * 5.5, y + 5.5, { align: 'center' });

  // Team 1 Row (Bibs)
  y += 8;
  doc.rect(tableX, y, contentWidth, 9);
  setBold(10);
  doc.text(`BIBS:  ${team1?.name || 'Team 1'}`, tableX + 4, y + 6);
  setRegular(10);
  doc.text(String(score?.team1QuarterScores.q1 ?? '-'), tableX + colW_Team + colW_Q * 0.5, y + 6, { align: 'center' });
  doc.text(String(score?.team1QuarterScores.q2 ?? '-'), tableX + colW_Team + colW_Q * 1.5, y + 6, { align: 'center' });
  doc.text(String(score?.team1QuarterScores.q3 ?? '-'), tableX + colW_Team + colW_Q * 2.5, y + 6, { align: 'center' });
  doc.text(String(score?.team1QuarterScores.q4 ?? '-'), tableX + colW_Team + colW_Q * 3.5, y + 6, { align: 'center' });
  doc.text(score?.isExtraTime ? String(score.team1QuarterScores.et) : '/', tableX + colW_Team + colW_Q * 4.5, y + 6, { align: 'center' });
  setBold(11);
  doc.text(String(score?.team1Total ?? '-'), tableX + colW_Team + colW_Q * 5.5, y + 6, { align: 'center' });

  // Team 2 Row (Kits)
  y += 9;
  doc.rect(tableX, y, contentWidth, 9);
  setBold(10);
  doc.text(`KITS:  ${team2?.name || 'Team 2'}`, tableX + 4, y + 6);
  setRegular(10);
  doc.text(String(score?.team2QuarterScores.q1 ?? '-'), tableX + colW_Team + colW_Q * 0.5, y + 6, { align: 'center' });
  doc.text(String(score?.team2QuarterScores.q2 ?? '-'), tableX + colW_Team + colW_Q * 1.5, y + 6, { align: 'center' });
  doc.text(String(score?.team2QuarterScores.q3 ?? '-'), tableX + colW_Team + colW_Q * 2.5, y + 6, { align: 'center' });
  doc.text(String(score?.team2QuarterScores.q4 ?? '-'), tableX + colW_Team + colW_Q * 3.5, y + 6, { align: 'center' });
  doc.text(score?.isExtraTime ? String(score.team2QuarterScores.et) : '/', tableX + colW_Team + colW_Q * 4.5, y + 6, { align: 'center' });
  setBold(11);
  doc.text(String(score?.team2Total ?? '-'), tableX + colW_Team + colW_Q * 5.5, y + 6, { align: 'center' });

  // Outcome banner
  y += 15;
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(tableX, y, contentWidth, 10, 2, 2, 'FD');
  setBold(10);
  doc.text(`FINAL RESULT: ${score?.winDescription || 'Completed'}`, tableX + 5, y + 6.5);

  // Fixture Stage Matrix Checkbox display
  y += 20;
  setBold(10);
  doc.text('POSTSEASON FIXTURE SELECTOR', margin, y);

  y += 5;
  const stages = [
    { label: 'PLAYOFF 1', sId: 'po1' },
    { label: 'PLAYOFF 2', sId: 'po2' },
    { label: 'SEMI-FINAL 1', sId: 'sf1' },
    { label: 'SEMI-FINAL 2', sId: 'sf2' },
    { label: 'FINALS', sId: 'finals' },
  ];

  stages.forEach((stg, i) => {
    const rowY = y + i * 11;
    setBold(9);
    doc.text(stg.label, margin, rowY + 5);

    for (let g = 1; g <= 5; g++) {
      const boxX = margin + 45 + (g - 1) * 14;
      const isCurrentMatch = fixture.seriesId === stg.sId && fixture.gameNumber === g;
      if (isCurrentMatch) {
        doc.setFillColor(30, 41, 59);
        doc.rect(boxX, rowY, 11, 7, 'F');
        doc.setTextColor(255, 255, 255);
        setBold(8);
      } else {
        doc.setFillColor(255, 255, 255);
        doc.rect(boxX, rowY, 11, 7, 'S');
        doc.setTextColor(100, 100, 100);
        setRegular(8);
      }
      doc.text(`0${g}`, boxX + 5.5, rowY + 4.8, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }
  });

  // Signatures & Notes Block
  y += 68;
  setBold(9);
  doc.text('OFFICIAL VERIFICATION & SIGNATURES', margin, y);

  y += 4;
  doc.rect(margin, y, contentWidth, 24);
  doc.line(margin + 50, y, margin + 50, y + 24);
  doc.line(margin, y + 12, margin + contentWidth, y + 12);

  setBold(9);
  doc.text('MATCHDAY OFFICIAL', margin + 3, y + 7);
  doc.text('RECORD KEEPER', margin + 3, y + 19);

  setRegular(8);
  doc.text('Official AFL Commissioner Signature Verified', margin + 55, y + 7);
  doc.text(`Digital Sign-off (Passcode Authenticated)`, margin + 55, y + 19);

  y += 30;
  setBold(9);
  doc.text('NOTES', margin, y);
  setRegular(8);
  doc.line(margin + 15, y, margin + contentWidth, y);
  doc.text(
    `Match recorded and sealed digitally via AFL Postseason Match Recorder on ${fixture.submittedAt || new Date().toISOString()}`,
    margin,
    y + 6
  );

  // ==========================================
  // PAGE 2: GOALS & ASSISTS RECORD
  // ==========================================
  doc.addPage();

  setBold(18);
  doc.text('GOALS & ASSISTS', margin, 20);
  setRegular(9);
  doc.text(
    `${team1?.name} vs ${team2?.name}  •  ${fixture.date}  •  Game ${fixture.gameNumber}`,
    margin,
    26
  );

  const quarters: Array<{ key: 'q1' | 'q2' | 'q3' | 'q4' | 'et'; label: string }> = [
    { key: 'q1', label: 'QUARTER 1' },
    { key: 'q2', label: 'QUARTER 2' },
    { key: 'q3', label: 'QUARTER 3' },
    { key: 'q4', label: 'QUARTER 4' },
  ];

  if (score?.isExtraTime) {
    quarters.push({ key: 'et', label: 'EXTRA TIME*' });
  }

  let curY = 34;

  quarters.forEach((q) => {
    // If not enough room on page, add page
    if (curY > pageHeight - 50) {
      doc.addPage();
      curY = 20;
    }

    // Quarter header
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, curY, contentWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    setBold(9);
    doc.text(q.label, margin + contentWidth / 2, curY + 5, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    curY += 7;

    // Team columns bar
    const halfWidth = contentWidth / 2;
    doc.setFillColor(240, 243, 246);
    doc.rect(margin, curY, halfWidth, 6, 'FD');
    doc.rect(margin + halfWidth, curY, halfWidth, 6, 'FD');

    setBold(8);
    const qTeam1Score = score?.team1QuarterScores[q.key] ?? 0;
    const qTeam2Score = score?.team2QuarterScores[q.key] ?? 0;
    doc.text(`${team1?.name || 'Bibs'} (${qTeam1Score})`, margin + 3, curY + 4.2);
    doc.text(`${team2?.name || 'Kits'} (${qTeam2Score})`, margin + halfWidth + 3, curY + 4.2);

    curY += 6;

    // Subheader
    setBold(7);
    doc.rect(margin, curY, halfWidth, 5);
    doc.rect(margin + halfWidth, curY, halfWidth, 5);
    doc.text("MIN   GOAL SCORER               ASSISTER / PEN", margin + 3, curY + 3.5);
    doc.text("MIN   GOAL SCORER               ASSISTER / PEN", margin + halfWidth + 3, curY + 3.5);

    curY += 5;

    // Events in this quarter
    const qEvents = events.filter((e) => e.quarter === q.key && e.type === 'goal');
    const team1Events = qEvents.filter((e) => e.teamId === team1?.id);
    const team2Events = qEvents.filter((e) => e.teamId === team2?.id);
    const maxRows = Math.max(team1Events.length, team2Events.length, 3);

    for (let r = 0; r < maxRows; r++) {
      doc.rect(margin, curY, halfWidth, 6);
      doc.rect(margin + halfWidth, curY, halfWidth, 6);

      setRegular(8);
      const ev1 = team1Events[r];
      if (ev1) {
        const scorer = getPlayerById(ev1.playerId)?.name || ev1.playerId;
        const assister = ev1.assisterId ? getPlayerById(ev1.assisterId)?.name : '';
        const tag = ev1.goalType === 'penalty' ? '(PEN)' : ev1.goalType === 'own_goal' ? '(OG)' : '';
        const note = [assister, tag].filter(Boolean).join(' ');
        doc.text(`${ev1.minute}'`, margin + 3, curY + 4.2);
        doc.text(scorer, margin + 14, curY + 4.2);
        if (note) doc.text(note, margin + 48, curY + 4.2);
      }

      const ev2 = team2Events[r];
      if (ev2) {
        const scorer = getPlayerById(ev2.playerId)?.name || ev2.playerId;
        const assister = ev2.assisterId ? getPlayerById(ev2.assisterId)?.name : '';
        const tag = ev2.goalType === 'penalty' ? '(PEN)' : ev2.goalType === 'own_goal' ? '(OG)' : '';
        const note = [assister, tag].filter(Boolean).join(' ');
        doc.text(`${ev2.minute}'`, margin + halfWidth + 3, curY + 4.2);
        doc.text(scorer, margin + halfWidth + 14, curY + 4.2);
        if (note) doc.text(note, margin + halfWidth + 48, curY + 4.2);
      }

      curY += 6;
    }

    curY += 4;
  });

  // ==========================================
  // PAGE 3: CARD BOOKINGS & SQUADS
  // ==========================================
  doc.addPage();
  setBold(18);
  doc.text('CARD BOOKINGS', margin, 20);

  let bY = 28;
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, bY, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  setBold(8);
  doc.text('QTR', margin + 4, bY + 4.8);
  doc.text('MIN', margin + 18, bY + 4.8);
  doc.text('TEAM', margin + 32, bY + 4.8);
  doc.text('PLAYER', margin + 65, bY + 4.8);
  doc.text('YELLOW', margin + 120, bY + 4.8);
  doc.text('RED', margin + 148, bY + 4.8);
  doc.setTextColor(0, 0, 0);

  bY += 7;

  const cardEvents = events.filter((e) => e.type === 'card');
  const cardRows = Math.max(cardEvents.length, 6);

  for (let i = 0; i < cardRows; i++) {
    doc.rect(margin, bY, contentWidth, 7);
    const ev = cardEvents[i];
    if (ev) {
      setRegular(8);
      const team = TEAMS[ev.teamId]?.name || ev.teamId;
      const player = getPlayerById(ev.playerId)?.fullName || ev.playerId;
      doc.text(ev.quarter.toUpperCase(), margin + 4, bY + 4.8);
      doc.text(`${ev.minute}'`, margin + 18, bY + 4.8);
      doc.text(team, margin + 32, bY + 4.8);
      doc.text(player, margin + 65, bY + 4.8);
      if (ev.cardType === 'yellow') {
        doc.text('✓', margin + 124, bY + 4.8);
      } else if (ev.cardType === 'red') {
        doc.text(ev.isSecondYellowRed ? '✓ (2nd Y)' : '✓', margin + 149, bY + 4.8);
      }
    }
    bY += 7;
  }

  // Squad rosters reference
  bY += 12;
  setBold(14);
  doc.text('TEAM ROSTERS', margin, bY);
  bY += 6;

  const t1Players = team1 ? getPlayersByTeam(team1.id) : [];
  const t2Players = team2 ? getPlayersByTeam(team2.id) : [];
  const half = contentWidth / 2;

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, bY, half, 6, 'F');
  doc.rect(margin + half, bY, half, 6, 'F');
  setBold(9);
  doc.text(team1?.name || 'Team 1', margin + 3, bY + 4.2);
  doc.text(team2?.name || 'Team 2', margin + half + 3, bY + 4.2);

  bY += 6;
  const maxSquad = Math.max(t1Players.length, t2Players.length);
  for (let s = 0; s < maxSquad; s++) {
    doc.rect(margin, bY, half, 5.5);
    doc.rect(margin + half, bY, half, 5.5);
    setRegular(8);
    if (t1Players[s]) {
      doc.text(`${s + 1}. ${t1Players[s].fullName}`, margin + 3, bY + 4);
    }
    if (t2Players[s]) {
      doc.text(`${s + 1}. ${t2Players[s].fullName}`, margin + half + 3, bY + 4);
    }
    bY += 5.5;
  }

  // Save the PDF
  const filename = `AFL_${fixture.seriesId.toUpperCase()}_Game${fixture.gameNumber}_Scoresheet.pdf`;
  doc.save(filename);
}
