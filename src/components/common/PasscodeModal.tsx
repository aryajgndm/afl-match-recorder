import React, { useState, useEffect, useRef } from 'react';
import { Fixture } from '../../types';
import { TEAMS } from '../../data/teams';
import { ArrowRight, Check, X } from 'lucide-react';

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
  subtitle = 'Enter passcode (Default: 123456)',
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
  const isCodeReady = code.length === 4 || code.length === 6;

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

  const seriesNameFormatted = fixture.seriesId.startsWith('po')
    ? `PLAYOFF ${fixture.seriesId.replace('po', '')}`
    : fixture.seriesId.startsWith('sf')
    ? `Semi-Final ${fixture.seriesId.replace('sf', '')}`
    : 'Finals';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="relative w-full max-w-sm bg-[#1c1c1c] border border-[#333333] rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full hover:bg-[#282828] transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Header Title: GAME and PLAYOFF capital */}
        <p className="font-sans font-bold text-xs tracking-wide text-neutral-400 mt-1">
          {title || `GAME ${fixture.gameNumber} · ${seriesNameFormatted}`}
        </p>

        {/* Team logos vs */}
        <div className="flex items-center justify-center gap-5 my-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center flex-shrink-0">
            {team1 ? (
              <img
                src={team1.logoUrl}
                alt={team1.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-sm text-neutral-500 font-bold">?</span>
            )}
          </div>

          <span className="font-display font-extrabold text-lg text-neutral-400 select-none">
            V
          </span>

          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center flex-shrink-0">
            {team2 ? (
              <img
                src={team2.logoUrl}
                alt={team2.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-sm text-neutral-500 font-bold">?</span>
            )}
          </div>
        </div>

        {/* Match Date (normal case) */}
        <p className="text-xs font-medium text-neutral-400 mb-5">{fixture.date}</p>

        {/* 6 Digit Passcode Input */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
          <div className="flex items-center justify-center gap-2 mb-6">
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

          {/* Primary Action Button: Darker blue for Start Recording, Dark emerald for View Results */}
          {buttonColor === 'green' ? (
            <button
              type="submit"
              disabled={!isCodeReady}
              className={`w-full py-3.5 rounded-full font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all uppercase ${
                isCodeReady
                  ? 'bg-emerald-800 hover:bg-emerald-700 text-white border border-emerald-600/40 active:scale-[0.98]'
                  : 'bg-[#282828] text-neutral-500 cursor-not-allowed'
              }`}
            >
              <Check size={16} className="stroke-[3]" />
              <span>{buttonText}</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!isCodeReady}
              className={`w-full py-3.5 rounded-full font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all uppercase ${
                isCodeReady
                  ? 'bg-[#0052cc] hover:bg-[#0047b3] text-white border border-blue-500/30 active:scale-[0.98]'
                  : 'bg-[#282828] text-neutral-500 cursor-not-allowed'
              }`}
            >
              <span>{buttonText}</span>
              <ArrowRight size={16} className="stroke-[3]" />
            </button>
          )}

          {/* Helper Subtitle (in-place error message) */}
          <p
            className={`text-[11px] mt-3 tracking-normal font-sans ${
              error ? 'text-rose-500 font-semibold' : 'text-neutral-400 font-medium'
            }`}
          >
            {error ? error : subtitle}
          </p>
        </form>
      </div>
    </div>
  );
};
