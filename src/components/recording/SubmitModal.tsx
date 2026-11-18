import React, { useState, useEffect, useRef } from 'react';
import { Fixture, MatchScore, Team } from '../../types';
import { Check, X } from 'lucide-react';

interface SubmitModalProps {
  fixture: Fixture;
  team1: Team | null;
  team2: Team | null;
  score: MatchScore;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (passcode: string) => void;
  error?: string | null;
}

export const SubmitModal: React.FC<SubmitModalProps> = ({
  fixture,
  team1,
  team2,
  score,
  isOpen,
  onClose,
  onSubmit,
  error,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (index: number, value: string) => {
    const char = value.slice(-1);
    if (!/^\d*$/.test(char)) return;

    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    onSubmit(code);
  };

  const seriesNameFormatted = fixture.seriesId.startsWith('po')
    ? `PLAYOFF ${fixture.seriesId.replace('po', '')}`
    : fixture.seriesId.startsWith('sf')
    ? `SEMI-FINAL ${fixture.seriesId.replace('sf', '')}`
    : 'FINALS';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm bg-[#161a23] border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
        {/* Header line */}
        <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">
          GAME {fixture.gameNumber} • {seriesNameFormatted}
        </p>
        <p className="text-xs font-medium text-slate-400 mt-1 mb-5">{fixture.date}</p>

        {/* Box score preview table */}
        <div className="w-full bg-[#1b202c] border border-slate-700/60 rounded-2xl p-3 mb-6">
          {/* Table Header */}
          <div className="grid grid-cols-7 text-[10px] font-black tracking-wider text-slate-400 pb-2 border-b border-slate-700/50">
            <span className="col-span-1 text-left pl-1">TEAM</span>
            <span className="text-center">Q1</span>
            <span className="text-center">Q2</span>
            <span className="text-center">Q3</span>
            <span className="text-center">Q4</span>
            <span className="text-center">ET</span>
            <span className="text-center font-bold text-white">FT</span>
          </div>

          {/* Team 1 Row */}
          <div className="grid grid-cols-7 text-xs font-bold items-center py-2 border-b border-slate-800/60">
            <div className="col-span-1 flex items-center gap-1.5 pl-1">
              <div className="w-4 h-4 rounded bg-slate-900 flex items-center justify-center">
                {team1 && <img src={team1.logoUrl} alt="" className="w-full h-full object-contain" />}
              </div>
              <span className="text-[11px] font-black text-white">{team1?.shortName}</span>
            </div>
            <span className="text-center text-slate-300">{score.team1QuarterScores.q1}</span>
            <span className="text-center text-slate-300">{score.team1QuarterScores.q2}</span>
            <span className="text-center text-slate-300">{score.team1QuarterScores.q3}</span>
            <span className="text-center text-slate-300">{score.team1QuarterScores.q4}</span>
            <span className="text-center text-slate-400">{score.isExtraTime ? score.team1QuarterScores.et : '/'}</span>
            <span className="text-center font-black text-white text-sm">{score.team1Total}</span>
          </div>

          {/* Team 2 Row */}
          <div className="grid grid-cols-7 text-xs font-bold items-center pt-2">
            <div className="col-span-1 flex items-center gap-1.5 pl-1">
              <div className="w-4 h-4 rounded bg-slate-900 flex items-center justify-center">
                {team2 && <img src={team2.logoUrl} alt="" className="w-full h-full object-contain" />}
              </div>
              <span className="text-[11px] font-black text-white">{team2?.shortName}</span>
            </div>
            <span className="text-center text-slate-300">{score.team2QuarterScores.q1}</span>
            <span className="text-center text-slate-300">{score.team2QuarterScores.q2}</span>
            <span className="text-center text-slate-300">{score.team2QuarterScores.q3}</span>
            <span className="text-center text-slate-300">{score.team2QuarterScores.q4}</span>
            <span className="text-center text-slate-400">{score.isExtraTime ? score.team2QuarterScores.et : '/'}</span>
            <span className="text-center font-black text-white text-sm">{score.team2Total}</span>
          </div>
        </div>

        {/* 6 Digit Passcode Input */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
          <div className="flex justify-center gap-2 mb-6">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-11 h-14 text-center text-2xl font-bold bg-[#1c2230] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            ))}
          </div>

          {/* Two Buttons: SUBMIT & CANCEL */}
          <div className="w-full grid grid-cols-2 gap-3 mb-2">
            <button
              type="submit"
              className="py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all text-white rounded-full font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/40 uppercase"
            >
              <Check size={16} className="stroke-[3]" />
              <span>SUBMIT</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-3.5 bg-rose-600 hover:bg-rose-500 active:scale-95 transition-all text-white rounded-full font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/40 uppercase"
            >
              <X size={16} className="stroke-[3]" />
              <span>CANCEL</span>
            </button>
          </div>

          {/* Subtitle / Error */}
          {error ? (
            <p className="text-xs font-semibold text-rose-500 mt-2 animate-pulse">{error}</p>
          ) : (
            <p className="text-xs text-slate-400 mt-2">Enter the passcode to submit.</p>
          )}
        </form>
      </div>
    </div>
  );
};
