import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  Avatar,
  Divider,
} from '@mui/material';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ShieldIcon from '@mui/icons-material/Shield';
import type { Player, League } from '../types/fantasy';
import { getPositionColor } from '../theme/theme';
import { calculateNetRooting } from '../utils/rootingGuide';

interface PlayerCardProps {
  player: Player;
  leagues: League[];
  mainLeagueId: string;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  leagues,
  mainLeagueId,
}) => {
  const leagueMap = new Map<string, League>(leagues.map((l) => [l.id, l]));

  // Separate participations by role
  const myParticipations = player.participations
    .filter((p) => p.role === 'my_team')
    .sort((a, b) => {
      const lA = leagueMap.get(a.leagueId)?.priority ?? 99;
      const lB = leagueMap.get(b.leagueId)?.priority ?? 99;
      return lA - lB;
    });

  const oppParticipations = player.participations
    .filter((p) => p.role === 'opponent')
    .sort((a, b) => {
      const lA = leagueMap.get(a.leagueId)?.priority ?? 99;
      const lB = leagueMap.get(b.leagueId)?.priority ?? 99;
      return lA - lB;
    });

  const isConflict = myParticipations.length > 0 && oppParticipations.length > 0;

  // Calculate Net Rooting EV stance
  const rooting = calculateNetRooting(player, leagues);

  // Determine Main League representation
  const mainLeaguePart = player.participations.find((p) => p.leagueId === mainLeagueId);
  const primaryPart = mainLeaguePart || myParticipations[0] || player.participations[0];
  const primaryLeague = primaryPart ? leagueMap.get(primaryPart.leagueId) : null;
  const isDirectMainLeague = primaryLeague?.id === mainLeagueId;

  // Is the main score helping you or hurting you?
  const isMainHelping = primaryPart ? primaryPart.role === 'my_team' : false;

  const posStyle = getPositionColor(player.position);

  // Projection Delta
  const mainPts = primaryPart ? primaryPart.points : 0;
  const mainProj = primaryPart ? primaryPart.projectedPoints : 0;
  const diffProj = Math.round((mainPts - mainProj) * 10) / 10;

  return (
    <Card
      sx={{
        borderRadius: 3,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        border: isConflict
          ? '1px solid rgba(245, 158, 11, 0.45)'
          : isDirectMainLeague
          ? isMainHelping
            ? '1px solid rgba(16, 185, 129, 0.35)'
            : '1px solid rgba(239, 68, 68, 0.4)'
          : '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: '#111726',
        '&:hover': {
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
          borderColor: isConflict
            ? '#f59e0b'
            : isDirectMainLeague
            ? isMainHelping
              ? '#10b981'
              : '#ef4444'
            : '#3b82f6',
        },
      }}
    >
      {/* Top Banner Stripe: Rooting & Conflict Guide */}
      <Box
        sx={{
          backgroundColor:
            rooting.stance === 'ROOT_FOR'
              ? 'rgba(16, 185, 129, 0.12)'
              : rooting.stance === 'ROOT_AGAINST'
              ? 'rgba(239, 68, 68, 0.14)'
              : 'rgba(245, 158, 11, 0.14)',
          borderBottom: `1px solid ${
            rooting.stance === 'ROOT_FOR'
              ? 'rgba(16, 185, 129, 0.25)'
              : rooting.stance === 'ROOT_AGAINST'
              ? 'rgba(239, 68, 68, 0.3)'
              : 'rgba(245, 158, 11, 0.3)'
          }`,
          px: 2.75,
          py: 0.85,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        {/* Left: Rooting EV badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {rooting.stance === 'ROOT_FOR' && <TrendingUpIcon sx={{ color: '#34d399', fontSize: 17 }} />}
          {rooting.stance === 'ROOT_AGAINST' && <TrendingDownIcon sx={{ color: '#f87171', fontSize: 17 }} />}
          {rooting.stance === 'NEUTRAL' && <SwapHorizIcon sx={{ color: '#fbbf24', fontSize: 17 }} />}
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              fontSize: '0.74rem',
              color:
                rooting.stance === 'ROOT_FOR'
                  ? '#34d399'
                  : rooting.stance === 'ROOT_AGAINST'
                  ? '#f87171'
                  : '#fbbf24',
            }}
          >
            {rooting.label}
          </Typography>
        </Box>

        {/* Right: Summary or Conflict Alert */}
        <Typography variant="caption" sx={{ color: '#cbd5e1', fontSize: '0.7rem' }}>
          {isConflict
            ? `⚠️ Owned in ${myParticipations.length}, Facing in ${oppParticipations.length}`
            : rooting.summary}
        </Typography>
      </Box>

      <CardContent sx={{ px: 2.75, py: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Row 1: Headshot, Name, Position, Game Status */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
          <Avatar
            src={player.headshotUrl}
            alt={player.name}
            sx={{
              width: 58,
              height: 58,
              border: `2px solid ${posStyle.border}`,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            {player.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </Avatar>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {/* Name + Pos + Team */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 0.25 }}>
              <Typography variant="subtitle1" noWrap sx={{ fontWeight: 800, color: '#f9fafb', fontSize: '1.05rem' }}>
                {player.name}
              </Typography>
              <Chip
                label={player.position}
                size="small"
                sx={{
                  backgroundColor: posStyle.bg,
                  color: posStyle.text,
                  border: `1px solid ${posStyle.border}`,
                  fontWeight: 800,
                  fontSize: '0.68rem',
                  height: 20,
                }}
              />
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#9ca3af' }}>
                {player.nflTeam}
              </Typography>
            </Box>

            {/* Game Clock & Status */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ color: '#d1d5db', fontWeight: 600 }}>
                {player.game.opponent}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6b7280' }}>
                •
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {player.game.status === 'LIVE' && (
                  <FiberManualRecordIcon
                    sx={{
                      fontSize: 10,
                      color: '#ef4444',
                      animation: 'pulse 1.5s infinite',
                      '@keyframes pulse': {
                        '0%': { opacity: 1 },
                        '50%': { opacity: 0.4 },
                        '100%': { opacity: 1 },
                      },
                    }}
                  />
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
              </Box>

              {/* Red Zone Badge */}
              {player.game.inRedZone && (
                <Chip
                  icon={<LocalFireDepartmentIcon sx={{ fontSize: '13px !important', color: '#f59e0b' }} />}
                  label="RED ZONE"
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>

        {/* Row 2: Main Score Highlight with "For You" vs "Against You" clarity */}
        <Box
          sx={{
            backgroundColor: isDirectMainLeague
              ? isMainHelping
                ? 'rgba(16, 185, 129, 0.08)'
                : 'rgba(239, 68, 68, 0.08)'
              : 'rgba(0, 0, 0, 0.3)',
            borderRadius: 2,
            p: 1.5,
            border: isDirectMainLeague
              ? isMainHelping
                ? '1px solid rgba(16, 185, 129, 0.25)'
                : '1px solid rgba(239, 68, 68, 0.3)'
              : '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {isDirectMainLeague ? (
                isMainHelping ? (
                  <WorkspacePremiumIcon sx={{ fontSize: 16, color: '#10b981' }} />
                ) : (
                  <ShieldIcon sx={{ fontSize: 16, color: '#ef4444' }} />
                )
              ) : (
                <WorkspacePremiumIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
              )}
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  color: isDirectMainLeague
                    ? isMainHelping
                      ? '#34d399'
                      : '#f87171'
                    : '#9ca3af',
                }}
              >
                {isDirectMainLeague
                  ? isMainHelping
                    ? 'MAIN LEAGUE (YOUR ROSTER)'
                    : `MAIN LEAGUE (FACING ${primaryLeague?.matchup.opponentTeamName.toUpperCase()})`
                  : `PRIMARY SCORE (#${primaryLeague?.priority || '1'}: ${isMainHelping ? 'YOU' : 'OPP'})`}
              </Typography>
            </Box>
            <Typography variant="caption" noWrap sx={{ color: '#d1d5db', display: 'block', maxWidth: 190 }}>
              {primaryLeague?.name}
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'right' }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, justifyContent: 'flex-end' }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 900,
                  color: isDirectMainLeague
                    ? isMainHelping
                      ? '#34d399'
                      : '#f87171'
                    : '#ffffff',
                  lineHeight: 1,
                }}
              >
                {mainPts.toFixed(1)}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#9ca3af' }}>
                pts
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end', mt: 0.25 }}>
              <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '0.72rem' }}>
                Proj: {mainProj.toFixed(1)}
              </Typography>
              {mainProj > 0 && (
                <Chip
                  label={`${diffProj >= 0 ? '+' : ''}${diffProj.toFixed(1)}`}
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    backgroundColor: diffProj >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: diffProj >= 0 ? '#34d399' : '#f87171',
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>

        {/* Stat Summary */}
        {player.stats.summary && (
          <Typography
            variant="caption"
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              color: '#d1d5db',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
            }}
          >
            📊 {player.stats.summary}
          </Typography>
        )}

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', my: 0.25 }} />

        {/* Row 3: League Participation Breakdown */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* Owned in: */}
          {myParticipations.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <CheckCircleIcon sx={{ fontSize: 14, color: '#34d399' }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#34d399', fontSize: '0.72rem' }}>
                  MY ROSTER ({myParticipations.length} League{myParticipations.length > 1 ? 's' : ''}):
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {myParticipations.map((part) => {
                  const league = leagueMap.get(part.leagueId);
                  if (!league) return null;
                  const isMain = league.id === mainLeagueId;

                  return (
                    <Box
                      key={part.leagueId}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1.5,
                        backgroundColor: isMain ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        border: isMain ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                        <Chip
                          label={`#${league.priority}`}
                          size="small"
                          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800, px: 0 }}
                        />
                        <Typography variant="caption" noWrap sx={{ color: '#e5e7eb', fontWeight: 600 }}>
                          {league.name}
                        </Typography>
                        {part.starterStatus === 'bench' && (
                          <Chip
                            label="BENCH"
                            size="small"
                            sx={{ height: 16, fontSize: '0.58rem', backgroundColor: 'rgba(255,255,255,0.08)', color: '#9ca3af' }}
                          />
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Typography variant="caption" sx={{ color: '#34d399', fontWeight: 800 }}>
                          {part.points.toFixed(1)} pts
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '0.65rem' }}>
                          ({league.scoringFormat})
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Facing Opponent: */}
          {oppParticipations.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <HighlightOffIcon sx={{ fontSize: 14, color: '#f87171' }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#f87171', fontSize: '0.72rem' }}>
                  FACING OPPONENT ({oppParticipations.length} League{oppParticipations.length > 1 ? 's' : ''}):
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {oppParticipations.map((part) => {
                  const league = leagueMap.get(part.leagueId);
                  if (!league) return null;
                  const isMain = league.id === mainLeagueId;

                  return (
                    <Box
                      key={part.leagueId}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1.5,
                        backgroundColor: isMain ? 'rgba(239, 68, 68, 0.14)' : 'rgba(239, 68, 68, 0.08)',
                        border: isMain ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(239, 68, 68, 0.2)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                        <Chip
                          label={`#${league.priority}`}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            backgroundColor: 'rgba(239, 68, 68, 0.25)',
                            color: '#f87171',
                          }}
                        />
                        <Typography variant="caption" noWrap sx={{ color: '#fca5a5', fontWeight: 600 }}>
                          {league.name} (vs {league.matchup.opponentTeamName})
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#f87171', fontWeight: 800 }}>
                        {part.points.toFixed(1)} pts
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
