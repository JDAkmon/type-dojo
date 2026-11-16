import {ERAS, LESSONS, typesFor, dualEffectiveness} from './data.js';
import {matchupKey} from './matchup.js';
import {lessonQuestions, recordChallenge, CHALLENGE_SIZE} from './progress.js';
import {BATTLE_SETS} from './battle-data.js';
import {availablePokemon, pokemonTypes} from './pokemon.js';

export const SESSION_KEY = 'type-dojo-session-v1';
const modes = ['lesson','attack','defense','immunity','dual','review','challenge','focus','moves'];

export function makeSession(mode, era, questions, lesson = null, focusType = null) {
  return {mode, era, questions, lesson, focusType, index:0, answers:[], hint:false, answered:false, finalized:false};
}

// Completion belongs to the final answer, not to the results-screen button.
export function finalizeSession(session, bucket, now = Date.now()) {
  if (session.finalized || session.answers.length !== session.questions.length) return false;
  const correct = session.answers.filter(a => a.correct && !a.assisted).length;
  if (session.mode === 'challenge') recordChallenge(bucket, correct, now);
  if (session.lesson && correct / session.questions.length >= .75 && !bucket.lessons.includes(session.lesson)) {
    bucket.lessons.push(session.lesson);
  }
  session.finalized = true;
  return true;
}

// Reconstruct all questions and move metadata from trusted game data on reload.
export function restoreSession(value) {
  if (!value || typeof value.era !== 'string' || !Object.hasOwn(ERAS, value.era) || !modes.includes(value.mode)) throw new Error('Invalid session.');
  const {era, mode} = value, types = typesFor(era);
  if (!Array.isArray(value.questions) || !value.questions.length || value.questions.length > 100) throw new Error('Invalid questions.');
  const lesson = value.lesson == null ? null : LESSONS.find(l => l.id === value.lesson);
  if ((mode === 'lesson') !== !!lesson || (value.focusType != null && (mode !== 'attack' || !types.includes(value.focusType)))) throw new Error('Invalid practice focus.');
  const questions = value.questions.map(q => {
    if (!q || !types.includes(q.a) || !Array.isArray(q.ds) || q.ds.some(t => !types.includes(t))) throw new Error('Invalid matchup.');
    const clean = {a:q.a, ds:[...q.ds], key:matchupKey(q.a,q.ds), value:dualEffectiveness(q.a,q.ds,era)};
    if (mode !== 'moves') return clean;
    const set = BATTLE_SETS[era].find(s => s.pokemonId === q.pokemonId && s.game === q.game);
    const target = availablePokemon(era).find(p => p.id === q.targetId);
    if (!set || !target || matchupKey(q.a,pokemonTypes(target,era)) !== clean.key || !Array.isArray(q.moves) || q.moves.length !== set.moves.length) throw new Error('Invalid move battle.');
    const moves = q.moves.map(m => {
      const known = set.moves.find(k => k.moveId === m.moveId);
      if (!known) throw new Error('Unknown move.');
      return {...known, value:dualEffectiveness(known.type,clean.ds,era)};
    });
    const best = Math.max(...moves.map(m => m.value));
    if (new Set(moves.map(m => m.moveId)).size !== moves.length || !moves.some(m => m.type === q.a && m.value === best)) throw new Error('Invalid battle options.');
    return {...clean, value:best, moves, pokemonId:set.pokemonId, targetId:target.id, game:set.game};
  });
  if (new Set(questions.map(q => mode === 'moves' ? `${q.pokemonId}:${q.targetId}` : q.key)).size !== questions.length) throw new Error('Repeated question.');
  if (lesson) {
    const expected = lessonQuestions(lesson,era);
    if (expected.length !== questions.length || questions.some(q => !expected.some(e => e.key === q.key))) throw new Error('Invalid lesson.');
  }
  if (mode === 'challenge' && questions.length !== CHALLENGE_SIZE) throw new Error('Invalid challenge.');
  if (value.focusType && questions.some(q => q.a !== value.focusType)) throw new Error('Invalid focused session.');
  const {index, answered, hint, finalized} = value;
  if (!Number.isInteger(index) || index < 0 || index > questions.length || typeof answered !== 'boolean' || typeof hint !== 'boolean' || typeof finalized !== 'boolean' || !Array.isArray(value.answers) || value.answers.length !== index + Number(answered) || (index === questions.length && answered)) throw new Error('Invalid session position.');
  const answers = value.answers.map((a,i) => {
    const q = questions[i];
    if (!a || typeof a.assisted !== 'boolean' || (mode === 'challenge' && a.assisted)) throw new Error('Invalid answer.');
    if (mode === 'moves') {
      const move = q.moves[a.moveIndex];
      if (!move || !Number.isInteger(a.moveIndex)) throw new Error('Invalid move answer.');
      return {value:move.value, correct:move.value === q.value, assisted:false, moveIndex:a.moveIndex};
    }
    if (!(q.ds.length === 2 ? [0,.25,.5,1,2,4] : [0,.5,1,2]).includes(a.value)) throw new Error('Invalid multiplier.');
    return {value:a.value, correct:a.value === q.value, assisted:a.assisted};
  });
  if (finalized !== (answers.length === questions.length)) throw new Error('Invalid completion state.');
  return {...makeSession(mode,era,questions,lesson?.id || null,value.focusType || null), index, answered, hint, finalized, answers};
}
