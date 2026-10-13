import React from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Rating,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import type { League } from '../types/fantasy';

interface MatchupBoardProps {
  leagues: League[];
  selectedLeagueIds: string[];
  onToggleLeagueFilter: (leagueId: string) => void;
}

export const MatchupBoard: React.FC<MatchupBoardProps> = ({
  leagues,
  selectedLeagueIds,
  onToggleLeagueFilter,
}) => {
  // Sort by priority ascending (1 is highest priority)
  const sortedLeagues = [...leagues].sort((a, b) => a.priority - b.priority);

  return (
    <Box sx={{ my: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmojiEventsIcon sx={{ color: '#fbbf24', fontSize: 24 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#f3f4f6' }}>
            League Matchups & Standings
          </Typography>
          <Typography variant="caption" sx={{ color: '#9ca3af', ml: 0.5 }}>
            (Ranked by Importance #1–#{sortedLeagues.length})
          </Typography>
        </Box>
        {selectedLeagueIds.length > 0 && (
          <Chip
            label="Filtered by League • Click to Reset"
            color="secondary"
            size="small"
            onDelete={() => onToggleLeagueFilter('RESET_ALL')}
            sx={{ fontWeight: 600 }}
          />
        )}
      </Box>

      {/* Grid of 6 Leagues */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(6, 1fr)',
          },
          gap: 1.5,
        }}
      >
        {sortedLeagues.map((league) => {
          const isSelected = selectedLeagueIds.includes(league.id);
          const diff = Math.round((league.matchup.myScore - league.matchup.opponentScore) * 10) / 10;
          const isWinning = diff >= 0;
          const isMainLeague = league.priority === 1 || league.isMain;

          // Win probability gauge from official API / Yahoo data
          const winProb = league.matchup.winProbability;

          return (
            <Card
              key={league.id}
              sx={{
                position: 'relative',
                borderRadius: 2.5,
                border: isSelected
                  ? '2px solid #3b82f6'
                  : isMainLeague
                  ? '2px solid #10b981'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: isSelected
                  ? 'rgba(59, 130, 246, 0.12)'
                  : isMainLeague
                  ? 'rgba(16, 185, 129, 0.05)'
                  : '#111726',
                boxShadow: isMainLeague
                  ? '0 4px 20px rgba(16, 185, 129, 0.15)'
                  : '0 2px 8px rgba(0,0,0,0.2)',
                '&:hover': {
                  borderColor: isMainLeague ? '#34d399' : '#60a5fa',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardActionArea
                onClick={() => onToggleLeagueFilter(league.id)}
                sx={{ p: 1.5, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
              >
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                  {/* Top Badges */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Chip
                        label={`#${league.priority}`}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          backgroundColor: isMainLeague ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                          color: isMainLeague ? '#ffffff' : '#e5e7eb',
                        }}
                      />
                      {league.importance && (
                        <Rating
                          value={league.importance}
                          readOnly
                          size="small"
                          sx={{
                            color: '#fbbf24',
                            fontSize: '0.85rem',
                            '& .MuiRating-iconEmpty': {
                              color: 'rgba(255, 255, 255, 0.2)',
                            },
                          }}
                        />
                      )}
                      {isMainLeague && (
                        <Chip
                          label="MAIN"
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            backgroundColor: 'rgba(245, 158, 11, 0.2)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                          }}
                        />
                      )}
                    </Box>

                    {/* Platform Tag */}
                    <Chip
                      label={league.platform.toUpperCase()}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        backgroundColor:
                          league.platform === 'espn'
                            ? 'rgba(239, 68, 68, 0.2)'
                            : 'rgba(168, 85, 247, 0.2)',
                        color: league.platform === 'espn' ? '#f87171' : '#c084fc',
                        border: `1px solid ${
                          league.platform === 'espn' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(168, 85, 247, 0.4)'
                        }`,
                      }}
                    />
                  </Box>

                  {/* League Name */}
                  <Typography
                    variant="subtitle2"
                    noWrap
                    title={league.name}
                    sx={{
                      fontWeight: 700,
                      color: '#f9fafb',
                      fontSize: '0.85rem',
                      mb: 1,
                    }}
                  >
                    {league.name}
                  </Typography>

                  {/* Matchup Comparison */}
                  <Box
                    sx={{
                      backgroundColor: 'rgba(0, 0, 0, 0.25)',
                      p: 1,
                      borderRadius: 1.5,
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      mb: 1,
                    }}
                  >
                    {/* User Team */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Box sx={{ overflow: 'hidden', pr: 0.5 }}>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: '#34d399', fontSize: '0.78rem' }}>
                          {league.matchup.myTeamName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '0.65rem' }}>
                          Proj: {league.matchup.myProjected.toFixed(1)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>
                        {league.matchup.myScore.toFixed(1)}
                      </Typography>
                    </Box>

                    {/* Opponent Team */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ overflow: 'hidden', pr: 0.5 }}>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 500, color: '#f87171', fontSize: '0.78rem' }}>
                          vs {league.matchup.opponentTeamName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '0.65rem' }}>
                          Proj: {league.matchup.opponentProjected.toFixed(1)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#cbd5e1', fontSize: '0.9rem' }}>
                        {league.matchup.opponentScore.toFixed(1)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Lead & Win Prob Bar */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', color: isWinning ? '#34d399' : '#f87171' }}>
                      {isWinning ? <ArrowDropUpIcon sx={{ fontSize: 18 }} /> : <ArrowDropDownIcon sx={{ fontSize: 18 }} />}
                      <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>
                        {isWinning ? `+${diff.toFixed(1)} pts` : `${diff.toFixed(1)} pts`}
                      </Typography>
                    </Box>
                    {winProb !== undefined && (
                      <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '0.68rem', fontWeight: 600 }}>
                        {winProb}% win
                      </Typography>
                    )}
                  </Box>

                  {winProb !== undefined ? (
                    <LinearProgress
                      variant="determinate"
                      value={winProb}
                      sx={{
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: 'rgba(239, 68, 68, 0.4)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#10b981',
                        },
                      }}
                    />
                  ) : null}
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
};
