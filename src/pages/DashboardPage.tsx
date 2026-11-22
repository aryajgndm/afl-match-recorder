import React, { useState, useEffect } from 'react';
import { Fixture, PostseasonPhase, Series } from '../types';
import { matchStorage } from '../lib/storage';
import { MatchCard } from '../components/dashboard/MatchCard';
import { PasscodeModal } from '../components/common/PasscodeModal';
import { TEAMS } from '../data/teams';
import { RefreshCw } from 'lucide-react';

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
  const [standingsView, setStandingsView] = useState<'round' | 'all'>('round');

  // Passcode modal state
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState<boolean>(false);
  const [passcodeModalMode, setPasscodeModalMode] = useState<'record' | 'results'>('record');
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
    // Unopenable historical matches before the use of this site
    if (fixture.isUnopenable) {
      return;
    }

    if (fixture.status === 'completed') {
      const isUnlocked = sessionStorage.getItem(`afl_unlocked_${fixture.id}`) === 'true';
      if (isUnlocked) {
        onNavigateToResults(fixture.id);
        return;
      }
      setSelectedFixture(fixture);
      setPasscodeModalMode('results');
      setPasscodeError(null);
      setIsPasscodeModalOpen(true);
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
      setPasscodeModalMode('record');
      setPasscodeError(null);
      setIsPasscodeModalOpen(true);
    }
  };

  const handlePasscodeSubmit = (code: string) => {
    if (!selectedFixture) return;

    if (passcodeModalMode === 'results' || selectedFixture.status === 'completed') {
      const valid = matchStorage.validatePasscode(selectedFixture.id, code);
      if (valid) {
        sessionStorage.setItem(`afl_unlocked_${selectedFixture.id}`, 'true');
        setIsPasscodeModalOpen(false);
        onNavigateToResults(selectedFixture.id);
      } else {
        setPasscodeError('Incorrect passcode. Try again.');
      }
      return;
    }

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

  // Determine series to display in standings
  const displayedSeries: Series[] = standingsView === 'round'
    ? (
        activeTab === 'playoffs'
          ? [seriesMap.po1, seriesMap.po2]
          : activeTab === 'semifinals'
          ? [seriesMap.sf1, seriesMap.sf2]
          : [seriesMap.finals]
      ).filter(Boolean)
    : [seriesMap.po1, seriesMap.po2, seriesMap.sf1, seriesMap.sf2, seriesMap.finals].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#121212] text-white pb-16 font-sans">
      {/* Main Container - top header removed as requested */}
      <main className="max-w-md mx-auto px-4 pt-6">
        {/* Series Standings Card Summary: Best-of-5 Tracker */}
        <div className="bg-[#242424] border border-[#333333] rounded-3xl p-4 sm:p-5 mb-5">
          {/* Header Row: Title and View Switcher (trophy icon removed) */}
          <div className="flex items-center justify-between pb-3 border-b border-[#333333] mb-3.5">
            <span className="text-xs font-bold text-white font-sans tracking-wide uppercase">
              SERIES STANDINGS (BEST-OF-5)
            </span>

            {/* View Toggle: Round vs All */}
            <div className="flex items-center bg-[#181818] p-0.5 rounded-full border border-[#333333]">
              <button
                type="button"
                onClick={() => setStandingsView('round')}
                className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full transition-all uppercase ${
                  standingsView === 'round'
                    ? 'bg-white text-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {activeTab}
              </button>
              <button
                type="button"
                onClick={() => setStandingsView('all')}
                className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full transition-all uppercase ${
                  standingsView === 'all'
                    ? 'bg-white text-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                All
              </button>
            </div>
          </div>

          {/* Series Standings Items */}
          <div className="flex flex-col gap-3">
            {displayedSeries.map((s) => {
              const team1 = s.team1Id ? TEAMS[s.team1Id] : null;
              const team2 = s.team2Id ? TEAMS[s.team2Id] : null;

              // Format series status badge: white accent and 3-letter abbreviations (no glow)
              let statusText = '';
              let statusBadgeClass = 'text-neutral-400 bg-neutral-800 border-neutral-700';

              if (s.isClinched && s.winnerId) {
                const winnerShort = TEAMS[s.winnerId]?.shortName || 'WIN';
                statusText = `${winnerShort} win series ${Math.max(s.team1Wins, s.team2Wins)} – ${Math.min(s.team1Wins, s.team2Wins)}`;
                statusBadgeClass = 'text-white bg-white/10 border border-white/20';
              } else if (!team1 || !team2) {
                statusText = s.phase === 'semifinals' ? 'Awaiting PLAYOFF Winners' : 'Awaiting Semi-Final Winners';
                statusBadgeClass = 'text-neutral-500 bg-[#1a1a1a] border border-neutral-800';
              } else if (s.team1Wins > s.team2Wins) {
                statusText = `${team1.shortName} lead ${s.team1Wins} – ${s.team2Wins}`;
                statusBadgeClass = 'text-white bg-white/10 border border-white/20';
              } else if (s.team2Wins > s.team1Wins) {
                statusText = `${team2.shortName} lead ${s.team2Wins} – ${s.team1Wins}`;
                statusBadgeClass = 'text-white bg-white/10 border border-white/20';
              } else if (s.team1Wins === 0 && s.team2Wins === 0) {
                statusText = 'Series Tied 0 – 0';
                statusBadgeClass = 'text-neutral-400 bg-[#1e1e1e] border border-neutral-800';
              } else {
                statusText = `Series Tied ${s.team1Wins} – ${s.team2Wins}`;
                statusBadgeClass = 'text-neutral-300 bg-[#282828] border border-neutral-700';
              }

              return (
                <div
                  key={s.id}
                  className="bg-[#181818] border border-[#2e2e2e] rounded-2xl p-3 sm:p-3.5 transition-all hover:border-[#3e3e3e]"
                >
                  {/* Item Top: Series Title & Status Badge */}
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-bold text-neutral-400 font-sans uppercase tracking-wider">
                      {s.name.replace(/playoff/gi, 'PLAYOFF')}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-sans ${statusBadgeClass}`}
                    >
                      {statusText}
                    </span>
                  </div>

                  {/* Item Center: Matchup & Best-of-5 Win Pips */}
                  <div className="flex items-center justify-between">
                    {/* Team 1 Side */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-1">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center flex-shrink-0">
                        {team1 ? (
                          <img
                            src={team1.logoUrl}
                            alt={team1.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] text-neutral-500 font-bold">
                            ?
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-display font-extrabold text-xs text-white uppercase truncate">
                          {team1 ? team1.name : (s.id === 'sf1' ? 'FALCONS' : s.id === 'sf2' ? 'RAPTORS' : 'TBD')}
                        </span>
                        {/* 3 Win Indicator Pips (White Accent, no glow) */}
                        <div className="flex items-center gap-1.5 mt-1">
                          {[0, 1, 2].map((i) => (
                            <span
                              key={i}
                              className={`w-2 h-2 rounded-full transition-all ${
                                i < s.team1Wins
                                  ? 'bg-white'
                                  : 'bg-neutral-800 border border-neutral-700'
                              }`}
                              title={`Win ${i + 1}: ${i < s.team1Wins ? 'Achieved' : 'Needed'}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Series Score Pill */}
                    <div className="flex flex-col items-center justify-center px-2 flex-shrink-0">
                      <div className="flex items-center gap-2 bg-[#121212] border border-[#333333] px-3 py-1 rounded-xl">
                        <span className="font-display font-extrabold text-base text-white">
                          {s.team1Wins}
                        </span>
                        <span className="text-neutral-500 font-sans text-xs font-bold">-</span>
                        <span className="font-display font-extrabold text-base text-white">
                          {s.team2Wins}
                        </span>
                      </div>
                      <span className="text-[9px] text-neutral-500 font-medium font-sans mt-0.5 uppercase tracking-wider">
                        First to 3
                      </span>
                    </div>

                    {/* Team 2 Side */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end pl-1 text-right">
                      <div className="flex flex-col min-w-0 items-end">
                        <span className="font-display font-extrabold text-xs text-white uppercase truncate">
                          {team2 ? team2.name : (s.id === 'sf1' ? 'WINNER PO1' : s.id === 'sf2' ? 'WINNER PO2' : 'TBD')}
                        </span>
                        {/* 3 Win Indicator Pips (White Accent, no glow) */}
                        <div className="flex items-center gap-1.5 mt-1 justify-end">
                          {[0, 1, 2].map((i) => (
                            <span
                              key={i}
                              className={`w-2 h-2 rounded-full transition-all ${
                                i < s.team2Wins
                                  ? 'bg-white'
                                  : 'bg-neutral-800 border border-neutral-700'
                              }`}
                              title={`Win ${i + 1}: ${i < s.team2Wins ? 'Achieved' : 'Needed'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center flex-shrink-0">
                        {team2 ? (
                          <img
                            src={team2.logoUrl}
                            alt={team2.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] text-neutral-500 font-bold">
                            ?
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Phase Tabs: Section selector in dashboard is solid BLACK */}
        <div className="flex items-center bg-[#1a1a1a] p-1 rounded-2xl border border-[#2e2e2e] mb-5">
          {(['playoffs', 'semifinals', 'finals'] as PostseasonPhase[]).map((phase) => {
            const isActive = activeTab === phase;
            return (
              <button
                key={phase}
                type="button"
                onClick={() => setActiveTab(phase)}
                className={`flex-1 py-2 text-xs font-bold tracking-wider rounded-xl transition-all uppercase font-sans ${
                  isActive
                    ? 'bg-black text-white shadow-sm border border-[#3e3e3e]'
                    : 'text-neutral-400 hover:text-white'
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
            type="button"
            onClick={() => {
              if (confirm('Reset match records back to default starting state?')) {
                matchStorage.resetToDefault();
                refreshData();
              }
            }}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-neutral-400 hover:text-white transition-colors py-2 px-3 rounded-lg border border-[#333333] bg-[#242424] shadow-xs uppercase font-sans"
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
          onClose={() => {
            setIsPasscodeModalOpen(false);
            setPasscodeError(null);
          }}
          onSubmit={handlePasscodeSubmit}
          error={passcodeError}
          buttonColor={passcodeModalMode === 'results' ? 'green' : 'blue'}
          buttonText={passcodeModalMode === 'results' ? 'VIEW RESULTS' : 'START RECORDING'}
          subtitle="Enter the passcode to continue."
        />
      )}
    </div>
  );
};
