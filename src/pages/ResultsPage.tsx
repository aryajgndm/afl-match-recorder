import React, { useState, useEffect } from 'react';
import { Fixture, MatchEvent, Quarter, Team } from '../types';
import { matchStorage } from '../lib/storage';
import { TEAMS } from '../data/teams';
import { ResultsTable } from '../components/results/ResultsTable';
import { QuarterScoreboard } from '../components/recording/QuarterScoreboard';
import { EventTimeline } from '../components/recording/EventTimeline';
import { exportMatchScoresheetPdf } from '../lib/pdfExport';
import { ChevronLeft, FileDown } from 'lucide-react';

interface ResultsPageProps {
  matchId: string;
  onNavigateBack: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ matchId, onNavigateBack }) => {
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [currentQuarter, setCurrentQuarter] = useState<Quarter>('q1');

  useEffect(() => {
    const f = matchStorage.getFixtureById(matchId);
    if (f) {
      setFixture(f);
      setEvents(matchStorage.getEvents(matchId));
    }
  }, [matchId]);

  if (!fixture || !fixture.result) {
    return (
      <div className="min-h-screen bg-[#0c0f14] flex flex-col items-center justify-center p-4 text-center">
        <p className="text-sm text-slate-400 mb-4">No finalized results available for this match yet.</p>
        <button
          onClick={onNavigateBack}
          className="px-4 py-2 bg-slate-800 text-white rounded-full text-xs font-bold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const team1: Team | null = fixture.team1Id ? TEAMS[fixture.team1Id] : null;
  const team2: Team | null = fixture.team2Id ? TEAMS[fixture.team2Id] : null;
  const score = fixture.result.score;

  const seriesNameFormatted = fixture.seriesId.startsWith('po')
    ? `PLAYOFF ${fixture.seriesId.replace('po', '')}`
    : fixture.seriesId.startsWith('sf')
    ? `SEMI-FINAL ${fixture.seriesId.replace('sf', '')}`
    : 'FINALS';

  const quarterEvents = events.filter((e) => e.quarter === currentQuarter);
  const team1QuarterScore = score.team1QuarterScores[currentQuarter] || 0;
  const team2QuarterScore = score.team2QuarterScores[currentQuarter] || 0;

  const quartersList: Quarter[] = ['q1', 'q2', 'q3', 'q4'];
  if (score.isExtraTime) {
    quartersList.push('et');
  }

  const handleExportPdf = () => {
    exportMatchScoresheetPdf(fixture, events, team1, team2);
  };

  return (
    <div className="min-h-screen bg-[#0c0f14] text-slate-100 flex flex-col justify-between pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#0e1117]/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateBack}
              className="p-1.5 -ml-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-black tracking-wider text-slate-300 uppercase">
                GAME {fixture.gameNumber} • {seriesNameFormatted}
              </span>
            </div>
          </div>

          <div className="text-xs font-medium text-slate-400">
            {fixture.date}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4">
        {/* Box Score Summary Table */}
        <ResultsTable score={score} team1={team1} team2={team2} />

        {/* Quarter indicator & Quarter Scoreboard */}
        <div className="mt-4">
          <QuarterScoreboard
            quarter={currentQuarter}
            team1={team1}
            team2={team2}
            team1QuarterScore={team1QuarterScore}
            team2QuarterScore={team2QuarterScore}
          />
        </div>

        {/* Quarter Events List */}
        <div className="mt-2">
          <EventTimeline
            events={quarterEvents}
            team1={team1}
            team2={team2}
            readOnly={true}
          />
        </div>
      </main>

      {/* Fixed Bottom Quarter Navigation & PDF Export */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#12151c] border-t border-slate-800 rounded-t-3xl shadow-2xl p-4 max-w-md mx-auto">
        <div className="flex items-center justify-between gap-3">
          {/* Quarter Pills */}
          <div className="flex items-center gap-1.5 bg-[#1a1f2c] p-1 rounded-full border border-slate-800">
            {quartersList.map((q) => {
              const isActive = currentQuarter === q;
              const label = q === 'et' ? 'ET' : q.toUpperCase();
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => setCurrentQuarter(q)}
                  className={`px-3.5 py-1.5 text-xs font-black tracking-wider rounded-full transition-all ${
                    isActive
                      ? 'bg-white text-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Export PDF Button */}
          <button
            onClick={handleExportPdf}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all text-white rounded-full font-bold text-xs tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-950/40 uppercase whitespace-nowrap"
          >
            <FileDown size={16} />
            <span>EXPORT PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
