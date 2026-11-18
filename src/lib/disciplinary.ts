import { MatchEvent } from '../types';

export interface PlayerDisciplinaryState {
  playerId: string;
  yellowCount: number;
  hasRed: boolean;
  isDismissed: boolean;
}

/**
 * Recalculates card states for all players in a match based on chronological order of card events.
 */
export function calculateDisciplinaryState(
  events: MatchEvent[]
): Map<string, PlayerDisciplinaryState> {
  const map = new Map<string, PlayerDisciplinaryState>();

  // Filter only card events and sort chronologically by minute
  const cardEvents = events
    .filter((e) => e.type === 'card')
    .sort((a, b) => a.minute - b.minute);

  for (const ev of cardEvents) {
    let state = map.get(ev.playerId);
    if (!state) {
      state = {
        playerId: ev.playerId,
        yellowCount: 0,
        hasRed: false,
        isDismissed: false,
      };
      map.set(ev.playerId, state);
    }

    if (ev.cardType === 'yellow') {
      state.yellowCount += 1;
      if (state.yellowCount >= 2) {
        state.hasRed = true;
        state.isDismissed = true;
      }
    } else if (ev.cardType === 'red') {
      state.hasRed = true;
      state.isDismissed = true;
    }
  }

  return map;
}

/**
 * Checks what card result should be generated when adding a card to a player.
 * If player already has 1 yellow and receives another yellow, it upgrades to a second-yellow red card.
 */
export function resolveNewCard(
  events: MatchEvent[],
  playerId: string,
  proposedCardType: 'yellow' | 'red'
): { cardType: 'yellow' | 'red'; isSecondYellowRed: boolean } {
  const existingCards = events
    .filter((e) => e.type === 'card' && e.playerId === playerId)
    .sort((a, b) => a.minute - b.minute);

  const existingYellows = existingCards.filter(
    (e) => e.cardType === 'yellow' && !e.isSecondYellowRed
  ).length;

  if (proposedCardType === 'yellow') {
    if (existingYellows >= 1) {
      // Automatic second-yellow red card dismissal
      return { cardType: 'red', isSecondYellowRed: true };
    }
    return { cardType: 'yellow', isSecondYellowRed: false };
  }

  return { cardType: 'red', isSecondYellowRed: false };
}
