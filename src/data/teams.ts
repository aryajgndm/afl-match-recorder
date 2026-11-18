import { Team } from '../types';

export const TEAMS: Record<string, Team> = {
  panthers: {
    id: 'panthers',
    name: 'Panthers',
    shortName: 'PAN',
    logoUrl: './logos/panthers.png',
  },
  bulls: {
    id: 'bulls',
    name: 'Bulls',
    shortName: 'BUL',
    logoUrl: './logos/bulls.png',
  },
  grizzlies: {
    id: 'grizzlies',
    name: 'Grizzlies',
    shortName: 'GRI',
    logoUrl: './logos/grizzlies.png',
  },
  stallions: {
    id: 'stallions',
    name: 'Stallions',
    shortName: 'STA',
    logoUrl: './logos/stallions.png',
  },
  falcons: {
    id: 'falcons',
    name: 'Falcons',
    shortName: 'FAL',
    logoUrl: './logos/falcons.png',
  },
  raptors: {
    id: 'raptors',
    name: 'Raptors',
    shortName: 'RAP',
    logoUrl: './logos/raptors.png',
  },
};
