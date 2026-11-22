import React, { useState, useEffect, useRef } from 'react';
import { Fixture, MatchScore, Team } from '../../types';
import { QuarterwiseScoresheetTable } from '../common/QuarterwiseScoresheetTable';
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

  // Capitalize GAME and PLAYOFF
  const seriesNameFormatted = fixture.seriesId.startsWith('po')
    ? `PLAYOFF ${fixture.seriesId.replace('po', '')}`
    : fixture.seriesId.startsWith('sf')
    ? `Semi-Final ${fixture.seriesId.replace('sf', '')}`
    : 'Finals';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
        {/* Top Header Line: GAME and PLAYOFF capital */}
        <div className="w-full flex items-center justify-between text-xs font-bold text-slate-500 mb-4 px-1 font-sans">
          <span>GAME {fixture.gameNumber} · {seriesNameFormatted}</span>
          <span className="font-medium text-slate-500">{fixture.date}</span>
        </div>

        {/* Box Score Summary Table */}
        <div className="w-full mb-5">
          <QuarterwiseScoresheetTable score={score} team1={team1} team2={team2} />
        </div>

        {/* 6 Digit Passcode Input */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
          <div className="flex items-center justify-center gap-2 mb-5">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-11 h-12 text-center text-xl font-display font-extrabold bg-white border-2 border-slate-300 focus:border-[#BE2041] rounded-xl text-slate-900 focus:outline-none transition-colors shadow-sm"
              />
            ))}
          </div>

          {/* Action Buttons: Submit (Blue) & Cancel */}
          <div className="flex items-center justify-center gap-3 w-full">
            <button
              type="submit"
              disabled={digits.join('').length !== 6}
              className={`flex-1 py-3 rounded-full font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 transition-all uppercase ${
                digits.join('').length === 6
                  ? 'bg-[#007AFF] hover:bg-[#0066DD] text-white active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Check size={16} className="stroke-[3]" />
              <span>SUBMIT</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-full font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 uppercase"
            >
              <X size={16} className="stroke-[3]" />
              <span>CANCEL</span>
            </button>
          </div>

          {/* Subtitle helper / in-place error message */}
          <p
            className={`text-[11px] mt-3 tracking-normal font-sans ${
              error ? 'text-rose-600 font-semibold' : 'text-slate-400 font-medium'
            }`}
          >
            {error ? 'Incorrect passcode. Try again.' : 'Enter the passcode to submit.'}
          </p>
        </form>
      </div>
    </div>
  );
};
