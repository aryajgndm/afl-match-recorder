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
      setPasscodeError(result.error || 'INCORRECT PASSCODE. TRY AGAIN.');
    }
  };

  // Filter and sort chronologically by date/game
  const phaseFixtures = fixtures.filter((f) => f.phase === activeTab);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 pb-16">
      {/* Top App Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-4 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#BE2041]/10 border border-[#BE2041]/30 flex items-center justify-center text-[#BE2041] font-display font-black text-sm shadow-xs">
              AFL
            </div>
            <div>
              <h1 className="font-display text-sm font-black tracking-wider uppercase text-slate-900 leading-none">
                MATCH RECORDER
              </h1>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                OFFICIAL POSTSEASON SCORESHEET
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 shadow-xs">
              <ShieldCheck size={12} className="text-emerald-500" />
              <span>2026</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto px-4 pt-4">
        {/* Series Standings Card Summary */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 mb-5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-black tracking-wider text-slate-800 uppercase mb-3">
            <Trophy size={14} className="text-amber-500" />
            <span>SERIES STANDINGS (BEST-OF-5)</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* PO1 */}
            <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase mb-1">
                <span>PLAYOFF 1</span>
                {seriesMap.po1.isClinched && (
                  <span className="text-emerald-600 font-black">CLINCHED</span>
                )}
              </div>
              <div className="flex items-center justify-between font-display font-black text-slate-900">
                <span className="truncate pr-1">PAN {seriesMap.po1.team1Wins}</span>
                <span className="text-slate-400 text-[10px] font-sans">-</span>
                <span className="truncate pl-1">{seriesMap.po1.team2Wins} BUL</span>
              </div>
            </div>

            {/* PO2 */}
            <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase mb-1">
                <span>PLAYOFF 2</span>
                {seriesMap.po2.isClinched && (
                  <span className="text-emerald-600 font-black">CLINCHED</span>
                )}
              </div>
              <div className="flex items-center justify-between font-display font-black text-slate-900">
                <span className="truncate pr-1">GRI {seriesMap.po2.team1Wins}</span>
                <span className="text-slate-400 text-[10px] font-sans">-</span>
                <span className="truncate pl-1">{seriesMap.po2.team2Wins} STA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Phase Tabs: Playoffs / Semifinals / Finals */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 mb-5">
          {(['playoffs', 'semifinals', 'finals'] as PostseasonPhase[]).map((phase) => {
            const isActive = activeTab === phase;
            return (
              <button
                key={phase}
                onClick={() => setActiveTab(phase)}
                className={`flex-1 py-2 text-xs font-bold tracking-wider rounded-xl transition-all uppercase ${
                  isActive
                    ? 'bg-[#BE2041] text-white shadow-md shadow-[#BE2041]/25'
                    : 'text-slate-600 hover:text-slate-900'
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
              if (confirm('RESET MATCH RECORDS BACK TO DEFAULT STARTING STATE?')) {
                matchStorage.resetToDefault();
                refreshData();
              }
            }}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors py-2 px-3 rounded-lg border border-slate-300 bg-white shadow-xs uppercase"
          >
            <RefreshCw size={12} />
            <span>RESET DEMO STATE</span>
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
          subtitle="ENTER THE PASSCODE TO CONTINUE."
        />
      )}
    </div>
  );
};
