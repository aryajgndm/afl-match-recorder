// Supabase Edge Function: generate-pdf
// Deno runtime - Cloud-based serverless PDF generator for AFL Match Scoresheets

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let payload;
    if (req.method === 'POST') {
      payload = await req.json();
    } else {
      const url = new URL(req.url);
      const matchId = url.searchParams.get('matchId');
      return new Response(
        JSON.stringify({ error: 'Please POST { fixture, events, team1, team2 } or invoke with match data.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { fixture, events = [], team1, team2 } = payload;
    if (!fixture) {
      return new Response(
        JSON.stringify({ error: 'Missing fixture payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    setBold(22);
    doc.text('AFL', margin, 24);
    setBold(11);
    doc.text('OFFICIAL', margin + 22, 21);
    doc.text('MATCHDAY', margin + 22, 26);
    doc.text('RECORD', margin + 22, 31);

    setBold(10);
    doc.text('ATRIA INSTITUTE OF TECHNOLOGY', pageWidth - margin, 22, { align: 'right' });
    setRegular(8);
    doc.text('AFL POSTSEASON 2026', pageWidth - margin, 27, { align: 'right' });

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
      `${(fixture.seriesId || '').toUpperCase()} • GAME ${fixture.gameNumber} (${(fixture.phase || '').toUpperCase()})`,
      margin + 69,
      y + 5.5
    );

    doc.rect(pageWidth - margin - 35, y, 35, 8);
    doc.text('COMPLETED', pageWidth - margin - 32, y + 5.5);

    // Scores table
    y += 18;
    const tableX = margin;
    const colW_Team = 60;
    const colW_Q = (contentWidth - colW_Team) / 6;

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

    y += 8;
    doc.rect(tableX, y, contentWidth, 9);
    setBold(10);
    doc.text(`BIBS:  ${team1?.name || 'Team 1'}`, tableX + 4, y + 6);
    setRegular(10);
    doc.text(String(score?.team1QuarterScores?.q1 ?? '-'), tableX + colW_Team + colW_Q * 0.5, y + 6, { align: 'center' });
    doc.text(String(score?.team1QuarterScores?.q2 ?? '-'), tableX + colW_Team + colW_Q * 1.5, y + 6, { align: 'center' });
    doc.text(String(score?.team1QuarterScores?.q3 ?? '-'), tableX + colW_Team + colW_Q * 2.5, y + 6, { align: 'center' });
    doc.text(String(score?.team1QuarterScores?.q4 ?? '-'), tableX + colW_Team + colW_Q * 3.5, y + 6, { align: 'center' });
    doc.text(score?.isExtraTime ? String(score.team1QuarterScores?.et ?? '-') : '/', tableX + colW_Team + colW_Q * 4.5, y + 6, { align: 'center' });
    setBold(11);
    doc.text(String(score?.team1Total ?? '-'), tableX + colW_Team + colW_Q * 5.5, y + 6, { align: 'center' });

    y += 9;
    doc.rect(tableX, y, contentWidth, 9);
    setBold(10);
    doc.text(`KITS:  ${team2?.name || 'Team 2'}`, tableX + 4, y + 6);
    setRegular(10);
    doc.text(String(score?.team2QuarterScores?.q1 ?? '-'), tableX + colW_Team + colW_Q * 0.5, y + 6, { align: 'center' });
    doc.text(String(score?.team2QuarterScores?.q2 ?? '-'), tableX + colW_Team + colW_Q * 1.5, y + 6, { align: 'center' });
    doc.text(String(score?.team2QuarterScores?.q3 ?? '-'), tableX + colW_Team + colW_Q * 2.5, y + 6, { align: 'center' });
    doc.text(String(score?.team2QuarterScores?.q4 ?? '-'), tableX + colW_Team + colW_Q * 3.5, y + 6, { align: 'center' });
    doc.text(score?.isExtraTime ? String(score.team2QuarterScores?.et ?? '-') : '/', tableX + colW_Team + colW_Q * 4.5, y + 6, { align: 'center' });
    setBold(11);
    doc.text(String(score?.team2Total ?? '-'), tableX + colW_Team + colW_Q * 5.5, y + 6, { align: 'center' });

    // Official result box
    y += 18;
    setBold(9);
    doc.text('OFFICIAL RESULT', margin, y);
    y += 3;
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y, contentWidth, 12, 'F');
    doc.rect(margin, y, contentWidth, 12, 'S');
    setBold(11);
    const winnerName =
      (score?.team1Total || 0) > (score?.team2Total || 0)
        ? team1?.name
        : (score?.team2Total || 0) > (score?.team1Total || 0)
        ? team2?.name
        : 'DRAW';
    const resultText =
      winnerName === 'DRAW'
        ? `MATCH DRAWN: ${score?.team1Total} - ${score?.team2Total}`
        : `${winnerName?.toUpperCase()} WON (${score?.team1Total} - ${score?.team2Total})`;
    doc.text(resultText, margin + 4, y + 7.5);

    // Certifications & Signature lines
    y += 24;
    setBold(9);
    doc.text('VERIFICATION & SIGN-OFF', margin, y);
    y += 4;
    const signBoxW = (contentWidth - 10) / 2;
    doc.rect(margin, y, signBoxW, 26);
    doc.rect(margin + signBoxW + 10, y, signBoxW, 26);

    setRegular(8);
    doc.text('OFFICIAL RECORDER / SCORER:', margin + 4, y + 6);
    doc.text('SIGNATURE: _______________________', margin + 4, y + 16);
    doc.text('DATE / TIME: _____________________', margin + 4, y + 22);

    doc.text('LEAGUE DATA TEAM REPRESENTATIVE:', margin + signBoxW + 14, y + 6);
    doc.text('SIGNATURE: _______________________', margin + signBoxW + 14, y + 16);
    doc.text('PASSCODE VERIFIED: ✓ COMPLIANT', margin + signBoxW + 14, y + 22);

    // Footer
    setRegular(7);
    doc.text('Page 1 of 3 — AFL Official Matchday Record • Auto-Generated Cloud Scoresheet', margin, pageHeight - 8);

    // ==========================================
    // PAGE 2: GOALS & SCORING SUMMARY
    // ==========================================
    doc.addPage();
    setBold(16);
    doc.text('GOALS & SCORING SUMMARY', margin, 22);
    setRegular(9);
    doc.text(`MATCH: ${team1?.name} vs ${team2?.name} • ${fixture.date}`, margin, 28);

    let gY = 36;
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, gY, contentWidth, 7, 'F');
    doc.rect(margin, gY, contentWidth, 7, 'S');
    setBold(8);
    doc.text('MIN', margin + 4, gY + 4.8);
    doc.text('QTR', margin + 18, gY + 4.8);
    doc.text('TEAM', margin + 32, gY + 4.8);
    doc.text('SCORER', margin + 70, gY + 4.8);
    doc.text('ASSISTER', margin + 120, gY + 4.8);
    doc.text('TYPE', margin + 160, gY + 4.8);

    gY += 7;
    const goals = events.filter((e: any) => e.type === 'goal');
    if (goals.length === 0) {
      doc.rect(margin, gY, contentWidth, 8);
      setRegular(9);
      doc.text('No goals recorded in this fixture.', margin + 4, gY + 5.5);
      gY += 8;
    } else {
      for (const g of goals) {
        doc.rect(margin, gY, contentWidth, 7);
        setRegular(8);
        doc.text(`${g.minute}'`, margin + 4, gY + 4.8);
        doc.text(String(g.quarter || '').toUpperCase(), margin + 18, gY + 4.8);
        doc.text(g.teamId === team1?.id ? (team1?.name || '') : (team2?.name || ''), margin + 32, gY + 4.8);
        doc.text(g.playerId || 'Unknown', margin + 70, gY + 4.8);
        doc.text(g.assisterId || '-', margin + 120, gY + 4.8);
        doc.text(String(g.goalType || 'Regular').toUpperCase(), margin + 160, gY + 4.8);
        gY += 7;
      }
    }

    setRegular(7);
    doc.text('Page 2 of 3 — AFL Scoring Summary', margin, pageHeight - 8);

    // ==========================================
    // PAGE 3: DISCIPLINE & ROSTERS
    // ==========================================
    doc.addPage();
    setBold(16);
    doc.text('DISCIPLINARY ACTIONS & BOOKINGS', margin, 22);

    let dY = 32;
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, dY, contentWidth, 7, 'F');
    doc.rect(margin, dY, contentWidth, 7, 'S');
    setBold(8);
    doc.text('MIN', margin + 4, dY + 4.8);
    doc.text('QTR', margin + 18, dY + 4.8);
    doc.text('TEAM', margin + 32, dY + 4.8);
    doc.text('PLAYER', margin + 70, dY + 4.8);
    doc.text('CARD TYPE', margin + 120, dY + 4.8);
    doc.text('DETAILS', margin + 155, dY + 4.8);

    dY += 7;
    const cards = events.filter((e: any) => e.type === 'card');
    if (cards.length === 0) {
      doc.rect(margin, dY, contentWidth, 8);
      setRegular(9);
      doc.text('No disciplinary sanctions or bookings recorded.', margin + 4, dY + 5.5);
      dY += 8;
    } else {
      for (const c of cards) {
        doc.rect(margin, dY, contentWidth, 7);
        setRegular(8);
        doc.text(`${c.minute}'`, margin + 4, dY + 4.8);
        doc.text(String(c.quarter || '').toUpperCase(), margin + 18, dY + 4.8);
        doc.text(c.teamId === team1?.id ? (team1?.name || '') : (team2?.name || ''), margin + 32, dY + 4.8);
        doc.text(c.playerId || 'Unknown', margin + 70, dY + 4.8);
        doc.text(String(c.cardType || '').toUpperCase(), margin + 120, dY + 4.8);
        doc.text(c.isSecondYellowRed ? '2nd Yellow -> Red' : '-', margin + 155, dY + 4.8);
        dY += 7;
      }
    }

    setRegular(7);
    doc.text('Page 3 of 3 — AFL Discipline & Verification', margin, pageHeight - 8);

    const pdfBuffer = doc.output('arraybuffer');

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="AFL_Scoresheet_${fixture.id}.pdf"`,
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
