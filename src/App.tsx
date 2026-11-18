import React, { useState, useEffect } from 'react';
import { DashboardPage } from './pages/DashboardPage';
import { RecordingPage } from './pages/RecordingPage';
import { ResultsPage } from './pages/ResultsPage';

type ViewMode = 'dashboard' | 'recording' | 'results';

export const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>('dashboard');
  const [matchId, setMatchId] = useState<string>('');

  // Synchronize with URL hash for browser refresh persistence and GitHub Pages
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      if (hash.startsWith('record/')) {
        const id = hash.replace('record/', '');
        setMatchId(id);
        setView('recording');
      } else if (hash.startsWith('results/')) {
        const id = hash.replace('results/', '');
        setMatchId(id);
        setView('results');
      } else {
        setView('dashboard');
        setMatchId('');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToDashboard = () => {
    window.location.hash = '#/';
  };

  const navigateToRecording = (id: string) => {
    window.location.hash = `#/record/${id}`;
  };

  const navigateToResults = (id: string) => {
    window.location.hash = `#/results/${id}`;
  };

  return (
    <div className="min-h-screen bg-[#0c0f14] text-slate-100 flex flex-col justify-start">
      {view === 'dashboard' && (
        <DashboardPage
          onNavigateToRecording={navigateToRecording}
          onNavigateToResults={navigateToResults}
        />
      )}

      {view === 'recording' && matchId && (
        <RecordingPage
          matchId={matchId}
          onNavigateBack={navigateToDashboard}
          onNavigateToResults={navigateToResults}
        />
      )}

      {view === 'results' && matchId && (
        <ResultsPage
          matchId={matchId}
          onNavigateBack={navigateToDashboard}
        />
      )}
    </div>
  );
};

export default App;
