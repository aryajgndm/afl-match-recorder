import React, { useState, useEffect, useRef } from 'react';
import { Fixture, MatchScore, Team } from '../../types';
import { formatSeriesLabel } from '../../lib/series';
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

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const code = digits.join('');
  const isCodeReady = code.length === 6;

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      if (isCodeReady) {
        onSubmit(code);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCodeReady) {
      onSubmit(code);
    }
  };

  const seriesNameFormatted = formatSeriesLabel(fixture.seriesId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="relative w-full max-w-sm bg-[#1c1c1c] border border-[#333333] rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
        {/* Top Header Line: GAME and PLAYOFF capital */}
        <div className="w-full flex items-center justify-between text-xs font-bold text-neutral-400 mb-4 px-1 font-sans">
          <span>GAME {fixture.gameNumber} · {seriesNameFormatted}</span>
          <span className="font-medium text-neutral-400">{fixture.date}</span>
        </div>

        {/* Box Score Summary Table (Dark theme) */}
        <div className="w-full mb-5">
          <QuarterwiseScoresheetTable score={score} team1={team1} team2={team2} theme="dark" />
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
                onPaste={handlePaste}
                className="w-11 h-12 text-center text-xl font-display font-extrabold bg-[#121212] border-2 border-[#383838] focus:border-[#0052cc] rounded-xl text-white focus:outline-none transition-colors"
              />
            ))}
          </div>

          {/* Action Buttons: Submit (Darker blue) & Cancel */}
          <div className="flex items-center justify-center gap-3 w-full">
            <button
              type="submit"
              disabled={!isCodeReady}
              className={`flex-1 py-3 rounded-full font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 transition-all uppercase ${
                isCodeReady
                  ? 'bg-[#0052cc] hover:bg-[#0047b3] border border-blue-500/30 text-white active:scale-95'
                  : 'bg-[#282828] text-neutral-500 cursor-not-allowed'
              }`}
            >
              <Check size={16} className="stroke-[3]" />
              <span>SUBMIT</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-rose-700 hover:bg-rose-600 text-white rounded-full font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 uppercase"
            >
              <X size={16} className="stroke-[3]" />
              <span>CANCEL</span>
            </button>
          </div>

          {/* Subtitle helper / in-place error message */}
          <p
            className={`text-[11px] mt-3 tracking-normal font-sans ${
              error ? 'text-rose-500 font-semibold' : 'text-neutral-400 font-medium'
            }`}
          >
            {error ? error : 'Please enter the passcode to submit.'}
          </p>
        </form>
      </div>
    </div>
  );
};
