import React, { useState, useEffect, useRef } from 'react';
import { Fixture } from '../../types';
import { TEAMS } from '../../data/teams';
import { ArrowRight, X } from 'lucide-react';

interface PasscodeModalProps {
  fixture: Fixture;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (passcode: string) => void;
  error?: string | null;
  title?: string;
  buttonText?: string;
  subtitle?: string;
  buttonColor?: 'blue' | 'green';
}

export const PasscodeModal: React.FC<PasscodeModalProps> = ({
  fixture,
  isOpen,
  onClose,
  onSubmit,
  error,
  title,
  buttonText = 'START RECORDING',
  subtitle = 'Enter the passcode to continue.',
  buttonColor = 'blue',
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const team1 = fixture.team1Id ? TEAMS[fixture.team1Id] : null;
  const team2 = fixture.team2Id ? TEAMS[fixture.team2Id] : null;

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
    if (e.key === 'Enter') {
      const code = digits.join('');
      if (code.length === 6) {
        onSubmit(code);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    onSubmit(code);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm bg-[#161a23] border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Header subtitle */}
        <p className="font-display text-xs font-black tracking-widest text-slate-300 uppercase mt-2">
          {title || `GAME ${fixture.gameNumber} • ${fixture.seriesId.toUpperCase()}`}
        </p>

        {/* Team logos vs */}
        <div className="flex items-center justify-center gap-6 my-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center flex-shrink-0">
            {team1 ? (
              <img
                src={team1.logoUrl}
                alt={team1.name}
                className="w-full h-full object-contain filter drop-shadow-lg"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-800" />
            )}
          </div>
          <span className="font-display text-lg font-black text-slate-300">V</span>
          <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center flex-shrink-0">
            {team2 ? (
              <img
                src={team2.logoUrl}
                alt={team2.name}
                className="w-full h-full object-contain filter drop-shadow-lg"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-800" />
            )}
          </div>
        </div>

        {/* Date */}
        <p className="text-xs font-medium text-slate-400 mb-6">{fixture.date}</p>

        {/* 6 Digit Inputs */}
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
                className="w-11 h-14 text-center text-2xl font-display font-black bg-[#1c2230] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-[#BE2041] focus:ring-2 focus:ring-[#BE2041]/20 transition-all"
              />
            ))}
          </div>

          {/* Action Button */}
          <button
            type="submit"
            className={`w-full py-4 rounded-full font-bold text-sm tracking-wide text-white flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 ${
              buttonColor === 'green'
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
                : 'bg-[#BE2041] hover:bg-[#a81938] shadow-[#BE2041]/30'
            }`}
          >
            <span>{buttonText}</span>
            <ArrowRight size={18} />
          </button>

          {/* Subtitle / error */}
          {error ? (
            <p className="text-xs font-semibold text-rose-500 mt-3 animate-pulse">{error}</p>
          ) : (
            <p className="text-xs text-slate-400 mt-3">{subtitle}</p>
          )}
        </form>
      </div>
    </div>
  );
};
