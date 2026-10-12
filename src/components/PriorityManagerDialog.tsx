import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Card,
  CardContent,
  TextField,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Radio,
  RadioGroup,
  FormControlLabel,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import StarIcon from '@mui/icons-material/Star';
import CloseIcon from '@mui/icons-material/Close';
import type { League, ScoringFormat } from '../types/fantasy';

interface PriorityManagerDialogProps {
  open: boolean;
  onClose: () => void;
  leagues: League[];
  onSaveLeagues: (updatedLeagues: League[]) => void;
}

export const PriorityManagerDialog: React.FC<PriorityManagerDialogProps> = ({
  open,
  onClose,
  leagues,
  onSaveLeagues,
}) => {
  const [localLeagues, setLocalLeagues] = useState<League[]>(() =>
    [...leagues].sort((a, b) => a.priority - b.priority)
  );
  const [mainId, setMainId] = useState<string>(() => {
    const main = leagues.find((l) => l.isMain);
    return main ? main.id : leagues[0]?.id || '';
  });

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setLocalLeagues([...leagues].sort((a, b) => a.priority - b.priority));
      const main = leagues.find((l) => l.isMain);
      setMainId(main ? main.id : leagues[0]?.id || '');
    }
  }

  const moveUp = (index: number) => {
    if (index === 0) return;
    const copy = [...localLeagues];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    // Recalculate priority numbers 1..n
    const updated = copy.map((l, i) => ({ ...l, priority: i + 1 }));
    setLocalLeagues(updated);
  };

  const moveDown = (index: number) => {
    if (index === localLeagues.length - 1) return;
    const copy = [...localLeagues];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    // Recalculate priority numbers 1..n
    const updated = copy.map((l, i) => ({ ...l, priority: i + 1 }));
    setLocalLeagues(updated);
  };

  const updateLeagueField = (id: string, field: string, value: any) => {
    setLocalLeagues((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        if (field === 'name') return { ...l, name: value };
        if (field === 'scoringFormat') return { ...l, scoringFormat: value as ScoringFormat };
        if (field === 'myTeamName') {
          return { ...l, matchup: { ...l.matchup, myTeamName: value } };
        }
        if (field === 'opponentTeamName') {
          return { ...l, matchup: { ...l.matchup, opponentTeamName: value } };
        }
        return l;
      })
    );
  };

  const handleSave = () => {
    const finalLeagues = localLeagues.map((l) => ({
      ...l,
      isMain: l.id === mainId,
    }));
    onSaveLeagues(finalLeagues);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            backgroundColor: '#111726',
            backgroundImage: 'none',
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#f3f4f6' }}>
            League Importance & Main Score Priority
          </Typography>
          <Typography variant="caption" sx={{ color: '#9ca3af' }}>
            Drag or move leagues to rank importance #1 to #{localLeagues.length}. Player cards will highlight scores from your #1 primary league.
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#9ca3af' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <RadioGroup value={mainId} onChange={(e) => setMainId(e.target.value)}>
            {localLeagues.map((league, idx) => {
              const isMain = league.id === mainId;
              return (
                <Card
                  key={league.id}
                  sx={{
                    mb: 1.5,
                    border: isMain ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                    backgroundColor: isMain ? 'rgba(16, 185, 129, 0.06)' : 'rgba(0, 0, 0, 0.25)',
                    borderRadius: 2.5,
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                      {/* Priority Up/Down Controls */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <IconButton
                          size="small"
                          disabled={idx === 0}
                          onClick={() => moveUp(idx)}
                          sx={{ p: 0.25, color: idx === 0 ? '#4b5563' : '#60a5fa' }}
                        >
                          <ArrowUpwardIcon fontSize="small" />
                        </IconButton>
                        <Chip
                          label={`#${idx + 1}`}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            backgroundColor: isMain ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                            color: '#fff',
                            height: 22,
                          }}
                        />
                        <IconButton
                          size="small"
                          disabled={idx === localLeagues.length - 1}
                          onClick={() => moveDown(idx)}
                          sx={{ p: 0.25, color: idx === localLeagues.length - 1 ? '#4b5563' : '#60a5fa' }}
                        >
                          <ArrowDownwardIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      {/* Main League Radio Select */}
                      <FormControlLabel
                        value={league.id}
                        control={<Radio sx={{ color: '#10b981', '&.Mui-checked': { color: '#10b981' } }} />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <StarIcon sx={{ fontSize: 16, color: isMain ? '#fbbf24' : '#6b7280' }} />
                            <Typography variant="body2" sx={{ fontWeight: 700, color: isMain ? '#34d399' : '#e5e7eb' }}>
                              {isMain ? 'Primary League' : 'Set as Primary'}
                            </Typography>
                          </Box>
                        }
                        sx={{ mr: 1 }}
                      />

                      {/* Platform Chip */}
                      <Chip
                        label={league.platform.toUpperCase()}
                        size="small"
                        sx={{
                          height: 22,
                          fontWeight: 700,
                          backgroundColor:
                            league.platform === 'espn' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                          color: league.platform === 'espn' ? '#f87171' : '#c084fc',
                        }}
                      />

                      {/* Editable Inputs */}
                      <Box sx={{ flexGrow: 1, display: 'flex', gap: 1.5, flexWrap: 'wrap', minWidth: 260 }}>
                        <TextField
                          label="League Name"
                          size="small"
                          value={league.name}
                          onChange={(e) => updateLeagueField(league.id, 'name', e.target.value)}
                          sx={{ flex: '1 1 180px' }}
                        />

                        <TextField
                          label="My Team"
                          size="small"
                          value={league.matchup.myTeamName}
                          onChange={(e) => updateLeagueField(league.id, 'myTeamName', e.target.value)}
                          sx={{ flex: '1 1 140px' }}
                        />

                        <TextField
                          label="Opponent"
                          size="small"
                          value={league.matchup.opponentTeamName}
                          onChange={(e) => updateLeagueField(league.id, 'opponentTeamName', e.target.value)}
                          sx={{ flex: '1 1 140px' }}
                        />

                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <InputLabel>Scoring</InputLabel>
                          <Select
                            value={league.scoringFormat}
                            label="Scoring"
                            onChange={(e) => updateLeagueField(league.id, 'scoringFormat', e.target.value)}
                          >
                            <MenuItem value="PPR">Full PPR</MenuItem>
                            <MenuItem value="HALF_PPR">Half PPR</MenuItem>
                            <MenuItem value="STANDARD">Standard</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </RadioGroup>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: '#9ca3af' }}>
          Cancel
        </Button>
        <Button variant="contained" color="primary" onClick={handleSave} sx={{ px: 3 }}>
          Save & Apply Priority
        </Button>
      </DialogActions>
    </Dialog>
  );
};
