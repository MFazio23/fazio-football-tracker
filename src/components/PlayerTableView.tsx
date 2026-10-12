import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  Chip,
  Avatar,
  Tooltip,
} from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import type { Player, League } from '../types/fantasy';
import { getPositionColor } from '../theme/theme';
import { calculateNetRooting } from '../utils/rootingGuide';

interface PlayerTableViewProps {
  players: Player[];
  leagues: League[];
  mainLeagueId: string;
}

export const PlayerTableView: React.FC<PlayerTableViewProps> = ({
  players,
  leagues,
  mainLeagueId,
}) => {
  const leagueMap = new Map<string, League>(leagues.map((l) => [l.id, l]));

  return (
    <TableContainer
      component={Paper}
      sx={{
        backgroundColor: '#111726',
        borderRadius: 2.5,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        overflowX: 'auto',
      }}
    >
      <Table size="small" aria-label="players table">
        <TableHead sx={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
          <TableRow>
            <TableCell sx={{ color: '#9ca3af', fontWeight: 700, py: 1.5 }}>Player</TableCell>
            <TableCell sx={{ color: '#9ca3af', fontWeight: 700, py: 1.5 }}>Game Status</TableCell>
            <TableCell sx={{ color: '#9ca3af', fontWeight: 700, py: 1.5 }}>Net Rooting Stance</TableCell>
            <TableCell sx={{ color: '#9ca3af', fontWeight: 700, py: 1.5, textAlign: 'right' }}>
              Main League Score
            </TableCell>
            <TableCell sx={{ color: '#9ca3af', fontWeight: 700, py: 1.5, textAlign: 'right' }}>
              Proj (Delta)
            </TableCell>
            <TableCell sx={{ color: '#9ca3af', fontWeight: 700, py: 1.5 }}>My Roster</TableCell>
            <TableCell sx={{ color: '#9ca3af', fontWeight: 700, py: 1.5 }}>Facing Opponent</TableCell>
            <TableCell sx={{ color: '#9ca3af', fontWeight: 700, py: 1.5 }}>Stats</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {players.map((player) => {
            const posStyle = getPositionColor(player.position);
            const rooting = calculateNetRooting(player, leagues);

            const myParts = player.participations.filter((p) => p.role === 'my_team');
            const oppParts = player.participations.filter((p) => p.role === 'opponent');

            const mainPart = player.participations.find((p) => p.leagueId === mainLeagueId);
            const isMainOwned = mainPart?.role === 'my_team';

            const primaryPart = mainPart || myParts[0] || player.participations[0];
            const mainPts = primaryPart ? primaryPart.points : 0;
            const mainProj = primaryPart ? primaryPart.projectedPoints : 0;
            const delta = Math.round((mainPts - mainProj) * 10) / 10;

            return (
              <TableRow
                key={player.id}
                hover
                sx={{
                  '&:nth-of-type(even)': { backgroundColor: 'rgba(255, 255, 255, 0.015)' },
                  '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.08) !important' },
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                {/* 1. Player Info */}
                <TableCell sx={{ py: 1.2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <Avatar
                      src={player.headshotUrl}
                      alt={player.name}
                      sx={{
                        width: 34,
                        height: 34,
                        border: `1.5px solid ${posStyle.border}`,
                        backgroundColor: 'rgba(255,255,255,0.05)',
                      }}
                    >
                      {player.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </Avatar>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#f9fafb' }}>
                          {player.name}
                        </Typography>
                        <Chip
                          label={player.position}
                          size="small"
                          sx={{
                            backgroundColor: posStyle.bg,
                            color: posStyle.text,
                            height: 18,
                            fontSize: '0.62rem',
                            fontWeight: 800,
                          }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                        {player.nflTeam}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>

                {/* 2. Game Status */}
                <TableCell sx={{ py: 1.2 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {player.game.status === 'LIVE' && (
                        <FiberManualRecordIcon sx={{ fontSize: 9, color: '#ef4444' }} />
                      )}
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          color:
                            player.game.status === 'LIVE'
                              ? '#34d399'
                              : player.game.status === 'FINAL'
                              ? '#9ca3af'
                              : '#60a5fa',
                        }}
                      >
                        {player.game.gameClock}
                      </Typography>
                      {player.game.inRedZone && (
                        <LocalFireDepartmentIcon sx={{ fontSize: 13, color: '#f59e0b' }} />
                      )}
                    </Box>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                      {player.game.opponent}
                    </Typography>
                  </Box>
                </TableCell>

                {/* 3. Net Rooting EV */}
                <TableCell sx={{ py: 1.2 }}>
                  <Tooltip title={rooting.summary}>
                    <Chip
                      icon={
                        rooting.stance === 'ROOT_FOR' ? (
                          <TrendingUpIcon sx={{ fontSize: '14px !important', color: '#34d399' }} />
                        ) : rooting.stance === 'ROOT_AGAINST' ? (
                          <TrendingDownIcon sx={{ fontSize: '14px !important', color: '#f87171' }} />
                        ) : (
                          <SwapHorizIcon sx={{ fontSize: '14px !important', color: '#fbbf24' }} />
                        )
                      }
                      label={rooting.label}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        backgroundColor:
                          rooting.stance === 'ROOT_FOR'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : rooting.stance === 'ROOT_AGAINST'
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(245, 158, 11, 0.15)',
                        color:
                          rooting.stance === 'ROOT_FOR'
                            ? '#34d399'
                            : rooting.stance === 'ROOT_AGAINST'
                            ? '#f87171'
                            : '#fbbf24',
                        border: `1px solid ${
                          rooting.stance === 'ROOT_FOR'
                            ? 'rgba(16, 185, 129, 0.3)'
                            : rooting.stance === 'ROOT_AGAINST'
                            ? 'rgba(239, 68, 68, 0.3)'
                            : 'rgba(245, 158, 11, 0.3)'
                        }`,
                      }}
                    />
                  </Tooltip>
                </TableCell>

                {/* 4. Main League Score */}
                <TableCell sx={{ py: 1.2, textAlign: 'right' }}>
                  {mainPart ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 900,
                          fontSize: '1rem',
                          color: isMainOwned ? '#34d399' : '#f87171',
                        }}
                      >
                        {mainPart.points.toFixed(1)} pts
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          color: isMainOwned ? '#34d399' : '#f87171',
                        }}
                      >
                        {isMainOwned ? 'YOUR TEAM' : 'OPPONENT'}
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#e5e7eb' }}>
                        {mainPts.toFixed(1)} pts
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.62rem', color: '#9ca3af' }}>
                        (#{primaryPart ? leagueMap.get(primaryPart.leagueId)?.priority : 1})
                      </Typography>
                    </Box>
                  )}
                </TableCell>

                {/* 5. Proj & Delta */}
                <TableCell sx={{ py: 1.2, textAlign: 'right' }}>
                  <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>
                    {mainProj.toFixed(1)}
                  </Typography>
                  {mainProj > 0 && (
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: delta >= 0 ? '#34d399' : '#f87171',
                      }}
                    >
                      {delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                    </Typography>
                  )}
                </TableCell>

                {/* 6. My Roster */}
                <TableCell sx={{ py: 1.2 }}>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {myParts.length > 0 ? (
                      myParts.map((p) => {
                        const l = leagueMap.get(p.leagueId);
                        return (
                          <Tooltip key={p.leagueId} title={`${l?.name}: ${p.points.toFixed(1)} pts`}>
                            <Chip
                              label={`#${l?.priority || ''}`}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                              }}
                            />
                          </Tooltip>
                        );
                      })
                    ) : (
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        —
                      </Typography>
                    )}
                  </Box>
                </TableCell>

                {/* 7. Facing Opponent */}
                <TableCell sx={{ py: 1.2 }}>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {oppParts.length > 0 ? (
                      oppParts.map((p) => {
                        const l = leagueMap.get(p.leagueId);
                        return (
                          <Tooltip
                            key={p.leagueId}
                            title={`${l?.name} (vs ${l?.matchup.opponentTeamName}): ${p.points.toFixed(1)} pts`}
                          >
                            <Chip
                              label={`#${l?.priority || ''}`}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                color: '#f87171',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                              }}
                            />
                          </Tooltip>
                        );
                      })
                    ) : (
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        —
                      </Typography>
                    )}
                  </Box>
                </TableCell>

                {/* 8. Stats */}
                <TableCell sx={{ py: 1.2 }}>
                  <Typography
                    variant="caption"
                    sx={{ color: '#cbd5e1', fontFamily: 'monospace', fontSize: '0.7rem' }}
                  >
                    {player.stats.summary || '—'}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
