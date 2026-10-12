import React from 'react';
import { Box, Typography, Button, Paper, Alert, Slide } from '@mui/material';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import type { Player, League } from '../types/fantasy';
import { PlayerCard } from './PlayerCard';
import { PlayerTableView } from './PlayerTableView';
import type { SimulatedPlayEvent } from '../services/liveSimulation';

interface PlayerGridProps {
  players: Player[];
  leagues: League[];
  mainLeagueId: string;
  latestEvent: SimulatedPlayEvent | null;
  viewMode: 'CARDS' | 'TABLE';
  onResetFilters: () => void;
}

export const PlayerGrid: React.FC<PlayerGridProps> = ({
  players,
  leagues,
  mainLeagueId,
  latestEvent,
  viewMode,
  onResetFilters,
}) => {
  return (
    <Box sx={{ mb: 6 }}>
      {/* Live Play Alert Banner */}
      {latestEvent && (
        <Slide direction="down" in={Boolean(latestEvent)} mountOnEnter unmountOnExit>
          <Alert
            icon={<FlashOnIcon sx={{ color: latestEvent.isTouchdown ? '#f59e0b' : '#34d399' }} />}
            sx={{
              mb: 2.5,
              backgroundColor: latestEvent.isTouchdown ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: `1px solid ${latestEvent.isTouchdown ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.3)'}`,
              color: '#fff',
              '& .MuiAlert-message': { width: '100%' },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 800, color: latestEvent.isTouchdown ? '#fbbf24' : '#34d399' }}>
                  {latestEvent.isTouchdown ? '🔥 TOUCHDOWN ALERT' : '⚡ LIVE SCORING UPDATE'}:
                </Typography>
                <Typography variant="body2" sx={{ color: '#f3f4f6' }}>
                  {latestEvent.description}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#9ca3af', fontFamily: 'monospace' }}>
                {latestEvent.timestamp} • +{latestEvent.pointsAdded} pts
              </Typography>
            </Box>
          </Alert>
        </Slide>
      )}

      {/* Empty State */}
      {players.length === 0 ? (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 3,
            backgroundColor: '#111726',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <SearchOffIcon sx={{ fontSize: 48, color: '#6b7280', mb: 1.5 }} />
          <Typography variant="h6" sx={{ color: '#e5e7eb', fontWeight: 700, mb: 1 }}>
            No players match the selected filters
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2.5 }}>
            Try clearing the league filters, changing position, or adjusting your search term.
          </Typography>
          <Button variant="outlined" color="primary" onClick={onResetFilters}>
            Reset All Filters
          </Button>
        </Paper>
      ) : viewMode === 'TABLE' ? (
        /* Compact RedZone Table View */
        <PlayerTableView
          players={players}
          leagues={leagues}
          mainLeagueId={mainLeagueId}
        />
      ) : (
        /* Player Card Responsive Grid */
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
            },
            gap: 2,
          }}
        >
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              leagues={leagues}
              mainLeagueId={mainLeagueId}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};
