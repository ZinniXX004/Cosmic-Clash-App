import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CharacterTierInfo } from './services/gemini.service';

@Component({
  selector: 'app-tier-comparison',
  imports: [CommonModule],
  template: `
    <div class="bg-white dark:bg-slate-800 rounded-xl p-6 mb-8 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style="animation-delay: 0.3s">
      <h3 class="text-2xl font-bold mb-6 text-center transition-colors duration-500" [class]="theme() === 'dark' ? 'text-cyan-400' : 'text-cyan-600'">Power Tier Comparison</h3>
      <div class="space-y-6">
        <!-- Fighter 1 -->
        <div class="grid grid-cols-4 gap-4 items-center">
          <div class="col-span-1 text-right truncate">
            <p class="font-bold text-sm sm:text-base text-slate-700 dark:text-slate-200" [title]="fighter1Name()">{{ fighter1Name() }}</p>
            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{{ fighter1Tier().tierName }}</p>
          </div>
          <div class="col-span-3 flex items-center gap-3">
            <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-6 overflow-hidden">
              <div 
                class="h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2"
                [style.width.%]="getBarWidth(fighter1Tier().tierValue)"
                [class]="getBarClasses(fighter1Tier().tierValue)">
              </div>
            </div>
            @if (fighter1Tier().tierNegatingAbilities.length > 0) {
              <div class="relative group cursor-help shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-500 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" /></svg>
                <div class="absolute bottom-full mb-2 w-48 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs text-center rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                  Has Tier-Negating Abilities
                  <div class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900"></div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Fighter 2 -->
        <div class="grid grid-cols-4 gap-4 items-center">
          <div class="col-span-1 text-right truncate">
            <p class="font-bold text-sm sm:text-base text-slate-700 dark:text-slate-200" [title]="fighter2Name()">{{ fighter2Name() }}</p>
            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{{ fighter2Tier().tierName }}</p>
          </div>
          <div class="col-span-3 flex items-center gap-3">
            <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-6 overflow-hidden">
              <div 
                class="h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2"
                [style.width.%]="getBarWidth(fighter2Tier().tierValue)"
                [class]="getBarClasses(fighter2Tier().tierValue)">
              </div>
            </div>
             @if (fighter2Tier().tierNegatingAbilities.length > 0) {
              <div class="relative group cursor-help shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-500 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" /></svg>
                 <div class="absolute bottom-full mb-2 w-48 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs text-center rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                  Has Tier-Negating Abilities
                  <div class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900"></div>
                </div>
              </div>
            }
          </div>
        </div>

        <div class="text-center text-xs text-slate-400 pt-4 border-t border-slate-200 dark:border-slate-700">
            <p>Bar length represents the character's power tier. Longer bars indicate a higher tier (lower tier number).</p>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TierComparisonComponent {
  fighter1Tier = input.required<CharacterTierInfo>();
  fighter2Tier = input.required<CharacterTierInfo>();
  fighter1Name = input.required<string>();
  fighter2Name = input.required<string>();
  theme = input.required<'dark' | 'light'>();

  getBarWidth(tierValue: number): number {
    // Tiers range from 0 (strongest) to 11 (weakest).
    // We want a longer bar for stronger tiers (lower tierValue).
    const maxTier = 12; // Use 12 to give tier 11 a small bar width.
    const invertedValue = Math.max(0, maxTier - tierValue);
    // Give a minimum width so even the weakest tiers are visible.
    const minWidth = 5;
    return minWidth + (100 - minWidth) * (invertedValue / maxTier);
  }

  getBarClasses(tierValue: number): string {
    if (tierValue === 0) { // Boundless
      return 'bg-gradient-to-r from-amber-400 to-yellow-400';
    }
    if (tierValue >= 1 && tierValue < 3) { // Universal/Multiversal
      return 'bg-gradient-to-r from-rose-500 to-fuchsia-500';
    }
    if (tierValue >= 3 && tierValue < 6) { // Cosmic/Galactic
      return 'bg-gradient-to-r from-indigo-500 to-purple-500';
    }
    // Mortal/Planetary and others
    return 'bg-gradient-to-r from-sky-500 to-emerald-500';
  }
}