import { Team } from '../types';

export const TEAMS: Record<string, Team> = {
  panthers: {
    id: 'panthers',
    name: 'Panthers',
    shortName: 'PAN',
    logoUrl: './logos/panthers.jpeg',
  },
  bulls: {
    id: 'bulls',
    name: 'Bulls',
    shortName: 'BUL',
    logoUrl: './logos/bulls.jpeg',
  },
  grizzlies: {
    id: 'grizzlies',
    name: 'Grizzlies',
    shortName: 'GRI',
    logoUrl: './logos/grizzlies.jpeg',
  },
  stallions: {
    id: 'stallions',
    name: 'Stallions',
    shortName: 'STA',
    logoUrl: './logos/stallions.jpeg',
  },
  falcons: {
    id: 'falcons',
    name: 'Falcons',
    shortName: 'FAL',
    logoUrl: './logos/falcons.jpeg',
  },
  raptors: {
    id: 'raptors',
    name: 'Raptors',
    shortName: 'RAP',
    logoUrl: './logos/raptors.jpeg',
  },
};
