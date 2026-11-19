import React, { useState, useEffect } from 'react';
import { Fixture, PostseasonPhase } from '../types';
import { matchStorage } from '../lib/storage';
import { MatchCard } from '../components/dashboard/MatchCard';
import { PasscodeModal } from '../components/common/PasscodeModal';
import { Trophy, ShieldCheck, RefreshCw } from 'lucide-react';

interface DashboardPageProps {
  onNavigateToRecording: (matchId: string) => void;
  onNavigateToResults: (matchId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToRecording,
  onNavigateToResults,
}) => {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [activeTab, setActiveTab] = useState<PostseasonPhase>('playoffs');

  // Passcode modal state
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState<boolean>(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  const refreshData = () => {
    setFixtures(matchStorage.getFixtures());
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = matchStorage.subscribe(() => {
      refreshData();
    });
    return () => unsubscribe();
  }, []);

  const seriesMap = matchStorage.getSeries();

  const handleSelectFixture = (fixture: Fixture) => {
    if (fixture.status === 'completed') {
      onNavigateToResults(fixture.id);
      return;
    }

    if (fixture.status === 'available' || fixture.status === 'in_progress') {
      const sessionId = matchStorage.getOrCreateClientSessionId();
      // If already has active lock by this session, enter directly
      if (fixture.activeSessionId === sessionId) {
        onNavigateToRecording(fixture.id);
        return;
      }

      setSelectedFixture(fixture);
      setPasscodeError(null);
      setIsPasscodeModalOpen(true);
    }
  };

  const handlePasscodeSubmit = (code: string) => {
    if (!selectedFixture) return;

    const sessionId = matchStorage.getOrCreateClientSessionId();
    const result = matchStorage.acquireRecordingLock(selectedFixture.id, code, sessionId);

    if (result.success) {
      setIsPasscodeModalOpen(false);
      onNavigateToRecording(selectedFixture.id);
    } else {
      setPasscodeError(result.error || 'Incorrect passcode. Try again.');
    }
  };

  // Filter and sort chronologically by date/game
  const phaseFixtures = fixtures.filter((f) => f.phase === activeTab);

  return (
    <div className="min-h-screen bg-[#0c0f14] text-slate-100 pb-16">
      {/* Top App Header */}
      <header className="sticky top-0 z-30 bg-[#0e1117]/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#BE2041]/20 border border-[#BE2041]/40 flex items-center justify-center text-[#BE2041] font-display font-black text-sm shadow-sm">
              AFL
            </div>
            <div>
              <h1 className="font-display text-sm font-black tracking-wider uppercase text-white leading-none">
                Match Recorder
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">Official Postseason Scoresheet</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60 flex items-center gap-1">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span>2026</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto px-4 pt-4">
        {/* Series Standings Card Summary */}
        <div className="bg-[#141720] border border-slate-800 rounded-3xl p-4 mb-5 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-black tracking-wider text-slate-300 uppercase mb-3">
            <Trophy size={14} className="text-amber-400" />
            <span>Series Standings (Best-of-5)</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* PO1 */}
            <div className="bg-[#1a1f2c] rounded-2xl p-2.5 border border-slate-800/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
                <span>Playoff 1</span>
                {seriesMap.po1.isClinched && (
                  <span className="text-emerald-400 font-black">CLINCHED</span>
                )}
              </div>
              <div className="flex items-center justify-between font-display font-black text-white">
                <span className="truncate pr-1">PAN {seriesMap.po1.team1Wins}</span>
                <span className="text-slate-500 text-[10px] font-sans">-</span>
                <span className="truncate pl-1">{seriesMap.po1.team2Wins} BUL</span>
              </div>
            </div>

            {/* PO2 */}
            <div className="bg-[#1a1f2c] rounded-2xl p-2.5 border border-slate-800/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
                <span>Playoff 2</span>
                {seriesMap.po2.isClinched && (
                  <span className="text-emerald-400 font-black">CLINCHED</span>
                )}
              </div>
              <div className="flex items-center justify-between font-display font-black text-white">
                <span className="truncate pr-1">GRI {seriesMap.po2.team1Wins}</span>
                <span className="text-slate-500 text-[10px] font-sans">-</span>
                <span className="truncate pl-1">{seriesMap.po2.team2Wins} STA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Phase Tabs: Playoffs / Semifinals / Finals */}
        <div className="flex items-center bg-[#151924] p-1 rounded-2xl border border-slate-800/80 mb-5">
          {(['playoffs', 'semifinals', 'finals'] as PostseasonPhase[]).map((phase) => {
            const isActive = activeTab === phase;
            return (
              <button
                key={phase}
                onClick={() => setActiveTab(phase)}
                className={`flex-1 py-2 text-xs font-black tracking-wider rounded-xl transition-all uppercase ${
                  isActive
                    ? 'bg-[#BE2041] text-white shadow-md shadow-[#BE2041]/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {phase}
              </button>
            );
          })}
        </div>

        {/* Chronological Fixtures List */}
        <div className="flex flex-col gap-4">
          {phaseFixtures.map((fixture) => (
            <MatchCard
              key={fixture.id}
              fixture={fixture}
              onSelect={handleSelectFixture}
            />
          ))}
        </div>

        {/* Footer Reset Tool for testing */}
        <div className="mt-12 text-center">
          <button
            onClick={() => {
              if (confirm('Reset match records back to default starting state?')) {
                matchStorage.resetToDefault();
                refreshData();
              }
            }}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-300 transition-colors py-2 px-3 rounded-lg border border-slate-800/60 hover:border-slate-700"
          >
            <RefreshCw size={12} />
            <span>Reset Demo State</span>
          </button>
        </div>
      </main>

      {/* Passcode Authentication Modal */}
      {selectedFixture && (
        <PasscodeModal
          fixture={selectedFixture}
          isOpen={isPasscodeModalOpen}
          onClose={() => setIsPasscodeModalOpen(false)}
          onSubmit={handlePasscodeSubmit}
          error={passcodeError}
          buttonColor="blue"
          buttonText="START RECORDING"
          subtitle="Enter the passcode to continue."
        />
      )}
    </div>
  );
};
