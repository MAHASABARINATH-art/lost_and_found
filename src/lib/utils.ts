import { supabase } from './supabase';
import type { LostItem, FoundItem } from '@/types';

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface MatchInput {
  category: string;
  item_name: string;
  location: string;
  date: string;
  color?: string | null;
  brand?: string | null;
  description: string;
}

interface MatchResult {
  score: number;
  reasons: string[];
}

export function calculateMatchScore(
  lost: MatchInput,
  found: MatchInput
): MatchResult {
  let score = 0;
  const reasons: string[] = [];
  const maxScore = 100;

  if (lost.category.toLowerCase() === found.category.toLowerCase()) {
    score += 25;
    reasons.push('Same category');
  }

  const lostNameLower = lost.item_name.toLowerCase();
  const foundNameLower = found.item_name.toLowerCase();
  const nameWords = lostNameLower.split(/\s+/).filter((w) => w.length > 2);
  const nameMatches = nameWords.filter((w) => foundNameLower.includes(w));
  if (nameMatches.length > 0) {
    score += 20;
    reasons.push(`Item name overlap: ${nameMatches.join(', ')}`);
  }

  if (
    lost.location.toLowerCase().includes(found.location.toLowerCase()) ||
    found.location.toLowerCase().includes(lost.location.toLowerCase())
  ) {
    score += 20;
    reasons.push('Same or nearby location');
  }

  if (lost.color && found.color) {
    if (lost.color.toLowerCase() === found.color.toLowerCase()) {
      score += 10;
      reasons.push('Matching color');
    }
  }

  if (lost.brand && found.brand) {
    if (lost.brand.toLowerCase() === found.brand.toLowerCase()) {
      score += 10;
      reasons.push('Matching brand');
    }
  }

  const lostDate = new Date(lost.date);
  const foundDate = new Date(found.date);
  const diffDays = Math.abs(
    Math.floor((foundDate.getTime() - lostDate.getTime()) / (1000 * 60 * 60 * 24))
  );
  if (diffDays <= 3) {
    score += 10;
    reasons.push(`Dates within ${diffDays} day(s)`);
  } else if (diffDays <= 7) {
    score += 5;
    reasons.push(`Dates within a week`);
  }

  const lostDescWords = new Set(
    lost.description.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  );
  const foundDescWords = found.description.toLowerCase().split(/\s+/);
  const descMatches = foundDescWords.filter((w) => lostDescWords.has(w) && w.length > 3);
  if (descMatches.length >= 2) {
    score += 5;
    reasons.push('Description keyword similarity');
  }

  return { score: Math.min(score, maxScore), reasons };
}

export async function generateMatchesForLostItem(lostItem: LostItem): Promise<void> {
  const { data: foundItems } = await supabase
    .from('found_items')
    .select('*')
    .eq('status', 'Found');

  if (!foundItems) return;

  for (const found of foundItems as FoundItem[]) {
    const result = calculateMatchScore(
      {
        category: lostItem.category,
        item_name: lostItem.item_name,
        location: lostItem.location_lost,
        date: lostItem.date_lost,
        color: lostItem.color,
        brand: lostItem.brand,
        description: lostItem.description,
      },
      {
        category: found.category,
        item_name: found.item_name,
        location: found.location_found,
        date: found.date_found,
        color: found.color,
        brand: found.brand,
        description: found.description,
      }
    );

    if (result.score >= 30) {
      await supabase.from('matches').upsert(
        {
          lost_item_id: lostItem.id,
          found_item_id: found.id,
          match_score: result.score,
          matching_reasons: result.reasons.join('; '),
          status: 'Possible',
        },
        { onConflict: 'lost_item_id,found_item_id' }
      );

      await supabase.from('notifications').insert({
        user_id: lostItem.user_id,
        title: 'Possible Match Found',
        message: `A found item may match your lost "${lostItem.item_name}" (${result.score}% match).`,
        related_type: 'match',
        related_id: found.id,
      });
    }
  }
}

export async function generateMatchesForFoundItem(foundItem: FoundItem): Promise<void> {
  const { data: lostItems } = await supabase
    .from('lost_items')
    .select('*')
    .eq('status', 'Lost');

  if (!lostItems) return;

  for (const lost of lostItems as LostItem[]) {
    const result = calculateMatchScore(
      {
        category: lost.category,
        item_name: lost.item_name,
        location: lost.location_lost,
        date: lost.date_lost,
        color: lost.color,
        brand: lost.brand,
        description: lost.description,
      },
      {
        category: foundItem.category,
        item_name: foundItem.item_name,
        location: foundItem.location_found,
        date: foundItem.date_found,
        color: foundItem.color,
        brand: foundItem.brand,
        description: foundItem.description,
      }
    );

    if (result.score >= 30) {
      await supabase.from('matches').upsert(
        {
          lost_item_id: lost.id,
          found_item_id: foundItem.id,
          match_score: result.score,
          matching_reasons: result.reasons.join('; '),
          status: 'Possible',
        },
        { onConflict: 'lost_item_id,found_item_id' }
      );

      await supabase.from('notifications').insert({
        user_id: lost.user_id,
        title: 'Possible Match Found',
        message: `A found item may match your lost "${lost.item_name}" (${result.score}% match).`,
        related_type: 'match',
        related_id: foundItem.id,
      });
    }
  }
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  relatedType?: string,
  relatedId?: string
): Promise<void> {
  await supabase.from('notifications').insert({
    user_id: userId,
    title,
    message,
    related_type: relatedType || null,
    related_id: relatedId || null,
  });
}
