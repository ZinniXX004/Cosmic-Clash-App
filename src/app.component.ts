import { Component, ChangeDetectionStrategy, signal, inject, effect, untracked, OnDestroy, computed, WritableSignal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { GeminiService, BattleResult, CharacterProfile, CharacterTierInfo, BattlePath, FighterStats, LoreConnection, TierNegatingAbility, CharacterLore } from './services/gemini.service';
import { CommonModule } from '@angular/common';
import { StatsChartComponent } from './stats-chart.component';
import { AboutComponent } from './about.component';
import { CharacterProfileComponent } from './character-profile.component';
import { ImageEditorComponent, ImageEditData } from './image-editor.component';
import { TierComparisonComponent } from './tier-comparison.component';
import { IntroComponent } from './intro.component';

export interface StyleOption {
  id: string;
  label: string;
}

export interface BattleHistoryEntry {
  id: string;
  fighter1: string;
  fighter2: string;
  winner: string;
  timestamp: number;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styles: [`
    :host {
      display: block;
    }
    /* Light theme scrollbar */
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: #f1f5f9; } /* slate-100 */
    ::-webkit-scrollbar-thumb { background: #ca8a04; border-radius: 4px; } /* yellow-600 */
    ::-webkit-scrollbar-thumb:hover { background: #a16207; } /* yellow-700 */

    /* Dark theme scrollbar */
    .dark ::-webkit-scrollbar-track { background: #020420; } /* custom dark blue */
    .dark ::-webkit-scrollbar-thumb { background: #facc15; } /* yellow-400 */
    .dark ::-webkit-scrollbar-thumb:hover { background: #eab308; } /* yellow-500 */

    @keyframes indeterminate-progress {
      from { transform: translateX(-100%); }
      to { transform: translateX(200%); }
    }
    .animate-progress-bar {
      position: relative;
      overflow-x: hidden;
    }
    .animate-progress-bar::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 50%;
      height: 100%;
      background: linear-gradient(to right, var(--progress-bar-start, #0ea5e9), var(--progress-bar-end, #facc15));
      animation: indeterminate-progress 2s infinite ease-in-out;
    }
    .animate-fade-in-fast {
      animation: fadeIn 0.3s ease-in-out forwards;
    }
    .animate-fade-in-up {
      animation: fadeInUp 0.5s ease-in-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes gradient-scroll {
      to {
        background-position: 200% center;
      }
    }
    .animate-gradient-text {
      background-size: 200% auto;
      animation: gradient-scroll 3s linear infinite;
    }

    @keyframes text-focus-in {
      0% {
        -webkit-filter: blur(12px);
        filter: blur(12px);
        opacity: 0;
      }
      100% {
        -webkit-filter: blur(0px);
        filter: blur(0px);
        opacity: 1;
      }
    }
    .animate-text-focus-in {
      /* Add a slight delay to start after the main block appears */
      animation: text-focus-in 1s cubic-bezier(0.550, 0.085, 0.680, 0.530) 0.3s forwards;
    }
    
    @keyframes slideInRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    .animate-slide-in-right {
      animation: slideInRight 0.35s cubic-bezier(0.25, 1, 0.5, 1) forwards;
    }

    .nav-button {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.75rem; /* 12px */
      padding: 0.75rem; /* 12px */
      border-radius: 0.5rem; /* 8px */
      font-weight: 600;
      text-align: left;
      transition: background-color 0.2s, color 0.2s;
    }
    .nav-button:hover {
      background-color: var(--nav-hover-bg);
      color: var(--nav-hover-text);
    }
    .nav-active {
      background-color: var(--nav-active-bg) !important;
      color: var(--nav-active-text) !important;
    }

    /* CSS variables define the new purple, blue, and gold theme */
    :host-context(.light) .nav-button {
      color: #1e3a8a; /* blue-900 */
      --nav-hover-bg: #e0e7ff; /* indigo-100 */
      --nav-hover-text: #1e1b4b; /* indigo-950 */
      --nav-active-bg: #ca8a04; /* yellow-600 */
      --nav-active-text: #ffffff; /* white */
    }
    :host-context(.dark) .nav-button {
      color: #e0e7ff; /* indigo-100 */
      --nav-hover-bg: #3730a3; /* indigo-700 */
      --nav-hover-text: #fefce8; /* yellow-50 */
      --nav-active-bg: #facc15; /* yellow-400 */
      --nav-active-text: #1e1b4b; /* indigo-950 */
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, StatsChartComponent, AboutComponent, CharacterProfileComponent, ImageEditorComponent, TierComparisonComponent, IntroComponent],
})
export class AppComponent implements OnDestroy {
  private geminiService = inject(GeminiService);
  // FIX: Explicitly type DomSanitizer to fix type inference issue where it was inferred as `unknown`.
  private sanitizer: DomSanitizer = inject(DomSanitizer);
  
  // Expose enum to template
  BattlePath = BattlePath;

  fighter1 = signal('');
  fighter2 = signal('');
  battleResult = signal<BattleResult | null>(null);
  error = signal<string | null>(null);
  isLoading = signal(false);
  isGettingRandom = signal(false);
  showAbout = signal(false);
  cooldown = signal(0);
  theme = signal<'dark' | 'light'>('dark');
  showIntro = signal(true);

  fighter1Error = signal<string | null>(null);
  fighter2Error = signal<string | null>(null);

  selectedCharacterProfile = signal<CharacterProfile | null>(null);
  isProfileLoading = signal(false);
  profileError = signal<string | null>(null);

  fighter1TierInfo = signal<CharacterTierInfo | null>(null);
  fighter2TierInfo = signal<CharacterTierInfo | null>(null);
  isFetchingFighter1Tier = signal(false);
  isFetchingFighter2Tier = signal(false);
  fighter1TierError = signal<string | null>(null);
  fighter2TierError = signal<string | null>(null);

  fighter1HasHax = computed(() => (this.fighter1TierInfo()?.tierNegatingAbilities?.length ?? 0) > 0);
  fighter2HasHax = computed(() => (this.fighter2TierInfo()?.tierNegatingAbilities?.length ?? 0) > 0);

  // Image Generation Signals
  fighter1Image = signal<string | null>(null);
  fighter2Image = signal<string | null>(null);
  aspectRatio = signal<'1:1' | '3:4' | '4:3' | '9:16' | '16:9'>('3:4');
  readonly aspectRatios: ('1:1' | '3:4' | '4:3' | '9:16' | '16:9')[] = ['1:1', '3:4', '4:3', '9:16', '16:9'];
  imageAspectRatioStyle = computed(() => this.aspectRatio().replace(':', ' / '));
  
  imageStyle = signal<string>('default');
  imageMood = signal<string>('default');

  readonly imageStyles: StyleOption[] = [
    { id: 'default', label: 'Default' },
    { id: 'anime', label: 'Anime' },
    { id: 'photorealistic', label: 'Photorealistic' },
    { id: 'comic book art', label: 'Comic Book' },
    { id: 'fantasy art', label: 'Fantasy' },
    { id: 'cel-shaded', label: 'Cel-Shaded' },
    { id: 'pixel art', label: 'Pixel Art' },
  ];
  readonly imageMoods: StyleOption[] = [
    { id: 'default', label: 'Default' },
    { id: 'epic battle', label: 'Epic Battle' },
    { id: 'dark and gritty', label: 'Dark & Gritty' },
    { id: 'heroic', label: 'Heroic' },
    { id: 'mysterious', label: 'Mysterious' },
    { id: 'serene', label: 'Serene' },
    { id: 'dynamic action', label: 'Dynamic' },
  ];

  // Image Editing
  editingImageData = signal<ImageEditData | null>(null);
  
  // Stats UI
  activeStatTab = signal<'chart' | 'table'>('chart');
  
  // Results View
  activeView = signal<'summary' | 'stats' | 'tier' | 'analysis' | 'sources'>('summary');
  expandedAnalysisSource = signal<string | null>(null);

  // Lore Connections
  exploringLoreConnection = signal(false);
  loreConnectionData = signal<LoreConnection | null>(null);
  isLoreConnectionLoading = signal(false);
  loreConnectionError = signal<string | null>(null);

  // Character Lore
  selectedCharacterLore = signal<CharacterLore | null>(null);
  isCharacterLoreLoading = signal(false);
  characterLoreError = signal<string | null>(null);

  // Battle History
  battleHistory = signal<BattleHistoryEntry[]>([]);
  showHistory = signal(false);

  // For stat breakdown table
  readonly statKeys: (keyof FighterStats)[] = ['strength', 'speed', 'durability', 'intelligence', 'energyProjection', 'fightingSkills'];
  
  loadingMessages = [
    'Analyzing power levels...',
    'Calculating combat speed...',
    'Simulating battle outcomes...',
    'Consulting the cosmic archives...',
    'Gauging dimensional tiers...',
    'Evaluating hax abilities...',
  ];
  currentLoadingMessage = signal(this.loadingMessages[0]);

  private getBattlePathForTier(tierValue: number): BattlePath {
    if (tierValue >= 6) return BattlePath.MORTAL_PLANETARY;
    if (tierValue >= 3) return BattlePath.COSMIC_GALACTIC;
    if (tierValue >= 1) return BattlePath.UNIVERSAL_MULTIVERSAL;
    if (tierValue >= 0) return BattlePath.BOUNDLESS;
    return BattlePath.PENDING;
  }

  battlePath = computed<BattlePath>(() => {
    const tier1 = this.fighter1TierInfo();
    const tier2 = this.fighter2TierInfo();

    if (!tier1 || !tier2) return BattlePath.PENDING;

    const path1 = this.getBattlePathForTier(tier1.tierValue);
    const path2 = this.getBattlePathForTier(tier2.tierValue);

    if (path1 === path2) {
      return path1;
    }

    if (this.fighter1HasHax() || this.fighter2HasHax()) {
      return BattlePath.CROSS_TIER_HAX;
    }

    return BattlePath.MISMATCH;
  });

  isBattleReady = computed(() => {
    const path = this.battlePath();
    return path !== BattlePath.PENDING && path !== BattlePath.MISMATCH;
  });

  // Dynamic Theming Signals
  pathThemeClasses = computed(() => {
    const path = this.battlePath();
    switch (path) {
      case BattlePath.MORTAL_PLANETARY: return 'bg-sky-950 text-sky-200';
      case BattlePath.COSMIC_GALACTIC: return 'bg-indigo-950 text-indigo-200';
      case BattlePath.UNIVERSAL_MULTIVERSAL: return 'bg-rose-950 text-rose-200';
      case BattlePath.BOUNDLESS: return 'bg-amber-950 text-amber-200';
      case BattlePath.CROSS_TIER_HAX: return 'bg-red-950 text-red-200';
      default: return 'bg-slate-900 text-slate-200';
    }
  });

  pathHeaderTextClasses = computed(() => {
    const path = this.battlePath();
    switch (path) {
      case BattlePath.MORTAL_PLANETARY: return 'from-sky-400 to-emerald-400';
      case BattlePath.COSMIC_GALACTIC: return 'from-indigo-400 to-purple-400';
      case BattlePath.UNIVERSAL_MULTIVERSAL: return 'from-rose-400 to-cyan-400';
      case BattlePath.BOUNDLESS: return 'from-amber-300 to-yellow-300';
      case BattlePath.CROSS_TIER_HAX: return 'from-red-500 to-orange-500';
      default: return 'from-indigo-400 to-cyan-400';
    }
  });

  pathButtonClasses = computed(() => {
    const path = this.battlePath();
    switch (path) {
      case BattlePath.MORTAL_PLANETARY: return 'from-sky-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700 shadow-emerald-600/30';
      case BattlePath.COSMIC_GALACTIC: return 'from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-600/30';
      case BattlePath.UNIVERSAL_MULTIVERSAL: return 'from-rose-600 to-cyan-600 hover:from-rose-700 hover:to-cyan-700 shadow-rose-600/30';
      case BattlePath.BOUNDLESS: return 'from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 shadow-yellow-500/30';
      case BattlePath.CROSS_TIER_HAX: return 'from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 shadow-red-600/30';
      default: return 'from-slate-600 to-gray-600';
    }
  });

   pathWinnerBorderClasses = computed(() => {
    const path = this.battlePath();
    switch (path) {
      case BattlePath.MORTAL_PLANETARY: return 'border-emerald-500 shadow-emerald-500/20';
      case BattlePath.COSMIC_GALACTIC: return 'border-purple-500 shadow-purple-500/20';
      case BattlePath.UNIVERSAL_MULTIVERSAL: return 'border-cyan-500 shadow-cyan-500/20';
      case BattlePath.BOUNDLESS: return 'border-yellow-400 shadow-yellow-400/20';
      case BattlePath.CROSS_TIER_HAX: return 'border-orange-500 shadow-orange-500/20';
      default: return 'border-green-500 shadow-green-500/10';
    }
  });

  // NEW Light Theme Dynamic Theming Signals
  lightPathThemeClasses = computed(() => {
    const path = this.battlePath();
    switch (path) {
      case BattlePath.MORTAL_PLANETARY: return 'bg-gradient-to-br from-sky-50 to-emerald-50 text-slate-800';
      case BattlePath.COSMIC_GALACTIC: return 'bg-gradient-to-br from-indigo-50 to-purple-50 text-slate-800';
      case BattlePath.UNIVERSAL_MULTIVERSAL: return 'bg-gradient-to-br from-rose-50 to-cyan-50 text-slate-800';
      case BattlePath.BOUNDLESS: return 'bg-gradient-to-br from-amber-50 to-yellow-50 text-slate-800';
      case BattlePath.CROSS_TIER_HAX: return 'bg-gradient-to-br from-red-50 to-orange-50 text-slate-800';
      default: return 'bg-slate-50 text-slate-800';
    }
  });

  lightPathHeaderTextClasses = computed(() => {
    const path = this.battlePath();
    switch (path) {
      case BattlePath.MORTAL_PLANETARY: return 'from-sky-600 to-emerald-600';
      case BattlePath.COSMIC_GALACTIC: return 'from-indigo-600 to-purple-600';
      case BattlePath.UNIVERSAL_MULTIVERSAL: return 'from-rose-600 to-cyan-600';
      case BattlePath.BOUNDLESS: return 'from-amber-500 to-yellow-500';
      case BattlePath.CROSS_TIER_HAX: return 'from-red-600 to-orange-600';
      default: return 'from-indigo-600 to-cyan-600';
    }
  });

  lightPathButtonClasses = computed(() => {
    const path = this.battlePath();
    switch (path) {
      case BattlePath.MORTAL_PLANETARY: return 'from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 shadow-emerald-500/30';
      case BattlePath.COSMIC_GALACTIC: return 'from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-indigo-500/30';
      case BattlePath.UNIVERSAL_MULTIVERSAL: return 'from-rose-500 to-cyan-500 hover:from-rose-600 hover:to-cyan-600 shadow-rose-500/30';
      case BattlePath.BOUNDLESS: return 'from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 shadow-yellow-500/30';
      case BattlePath.CROSS_TIER_HAX: return 'from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-red-500/30';
      default: return 'from-slate-500 to-gray-500';
    }
  });

  confidenceClasses = computed(() => {
    const result = this.battleResult();
    if (!result?.confidence) return '';
    switch (result.confidence) {
      case 'High': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-500/50';
      case 'Medium': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-500/50';
      case 'Low': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border-rose-500/50';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300 border-slate-500/50';
    }
  });
  
  fighter1Data = computed(() => {
    const res = this.battleResult();
    return res && res.fighter1 ? { name: res.fighter1.name, stats: res.fighter1.stats } : null;
  });

  fighter2Data = computed(() => {
    const res = this.battleResult();
    return res && res.fighter2 ? { name: res.fighter2.name, stats: res.fighter2.stats } : null;
  });

  fighter1TotalStats = computed(() => {
    const stats = this.fighter1Data()?.stats;
    if (!stats) return 0;
    return this.statKeys.reduce((sum, key) => sum + (stats[key] || 0), 0);
  });

  fighter2TotalStats = computed(() => {
    const stats = this.fighter2Data()?.stats;
    if (!stats) return 0;
    return this.statKeys.reduce((sum, key) => sum + (stats[key] || 0), 0);
  });

  private loadingInterval: any;
  private cooldownInterval: any;
  private fighter1TierDebounce: any;
  private fighter2TierDebounce: any;
  private currentBattleId = 0;

  constructor() {
    try {
        const hasSeenIntro = localStorage.getItem('cosmic-clash-intro-seen');
        if (hasSeenIntro === 'true') {
            this.showIntro.set(false);
        }
    } catch (e) {
        console.warn('Could not access localStorage. Intro will be shown.');
        this.showIntro.set(true);
    }

    const savedTheme = localStorage.getItem('cosmic-clash-theme') as 'dark' | 'light' | null;
    if (savedTheme) this.theme.set(savedTheme);
    else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.theme.set(prefersDark ? 'dark' : 'light');
    }
    
    this.loadHistory();

    effect(() => {
      const currentTheme = this.theme();
      document.documentElement.classList.toggle('dark', currentTheme === 'dark');
      localStorage.setItem('cosmic-clash-theme', currentTheme);
    });

    effect(() => {
      const loading = this.isLoading();
      untracked(() => {
        if (loading) this.startLoadingMessages();
        else this.stopLoadingMessages();
      });
    });
  }

  ngOnDestroy(): void {
    this.stopLoadingMessages();
    clearTimeout(this.fighter1TierDebounce);
    clearTimeout(this.fighter2TierDebounce);
    if (this.cooldownInterval) clearInterval(this.cooldownInterval);
  }

  enterApp(): void {
    this.showIntro.set(false);
    try {
        localStorage.setItem('cosmic-clash-intro-seen', 'true');
    } catch (e) {
        console.warn('Could not access localStorage. Intro setting will not be saved.');
    }
  }

  toggleTheme(): void {
    this.theme.update(current => (current === 'dark' ? 'light' : 'dark'));
  }

  openAbout(): void { this.showAbout.set(true); }
  closeAbout(): void { this.showAbout.set(false); }

  startLoadingMessages(): void {
    this.currentLoadingMessage.set(this.loadingMessages[0]);
    let messageIndex = 1;
    this.loadingInterval = setInterval(() => {
      this.currentLoadingMessage.set(this.loadingMessages[messageIndex % this.loadingMessages.length]);
      messageIndex++;
    }, 2000);
  }

  stopLoadingMessages(): void {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = null;
    }
  }

  startCooldown(): void {
    if (this.cooldownInterval) clearInterval(this.cooldownInterval);
    this.cooldown.set(10);
    this.cooldownInterval = setInterval(() => {
      this.cooldown.update(c => c - 1);
      if (this.cooldown() <= 0) {
        clearInterval(this.cooldownInterval);
        this.cooldownInterval = null;
      }
    }, 1000);
  }

  validateFighter(fighterSignal: WritableSignal<string>, errorSignal: WritableSignal<string | null>): void {
    const name = fighterSignal().trim();
    if (!name) errorSignal.set('Challenger name cannot be empty.');
    else if (name.length < 2) errorSignal.set('Name must be at least 2 characters.');
    else errorSignal.set(null);
  }

  async fetchTier(
    fighterSignal: WritableSignal<string>, 
    tierInfoSignal: WritableSignal<CharacterTierInfo | null>, 
    loadingSignal: WritableSignal<boolean>,
    errorSignal: WritableSignal<string | null>
  ): Promise<void> {
    const characterName = fighterSignal();
    loadingSignal.set(true);
    tierInfoSignal.set(null);
    errorSignal.set(null);
    try {
      const tierInfo = await this.geminiService.getCharacterTier(characterName);
      if (fighterSignal() === characterName) {
        tierInfoSignal.set(tierInfo);
      }
    } catch (e) {
      console.error(e);
      if (fighterSignal() === characterName) {
        errorSignal.set((e as Error).message);
        setTimeout(() => {
          if (errorSignal() === (e as Error).message) {
            errorSignal.set(null);
          }
        }, 7000);
      }
    } finally {
      if (fighterSignal() === characterName) {
        loadingSignal.set(false);
      }
    }
  }
  
  updateFighter(event: Event | { value: string }, fighter: 1 | 2): void {
    const value = 'value' in event ? event.value : (event.target as HTMLInputElement).value;
    const fighterSignal = fighter === 1 ? this.fighter1 : this.fighter2;
    const errorSignal = fighter === 1 ? this.fighter1Error : this.fighter2Error;
    const tierInfoSignal = fighter === 1 ? this.fighter1TierInfo : this.fighter2TierInfo;
    const loadingSignal = fighter === 1 ? this.isFetchingFighter1Tier : this.isFetchingFighter2Tier;
    const tierErrorSignal = fighter === 1 ? this.fighter1TierError : this.fighter2TierError;
    const debounceTimer = fighter === 1 ? 'fighter1TierDebounce' : 'fighter2TierDebounce';

    fighterSignal.set(value);
    tierInfoSignal.set(null);
    tierErrorSignal.set(null);
    this.battleResult.set(null);
    this.fighter1Image.set(null);
    this.fighter2Image.set(null);
    this.editingImageData.set(null);
    this.exploringLoreConnection.set(false);

    if (errorSignal()) this.validateFighter(fighterSignal, errorSignal);
    
    clearTimeout(this[debounceTimer]);
    if (value.trim().length > 1) {
      this[debounceTimer] = setTimeout(() => {
        this.fetchTier(fighterSignal, tierInfoSignal, loadingSignal, tierErrorSignal);
      }, 750);
    } else {
      loadingSignal.set(false);
    }
  }

  clearFighter(fighter: 1 | 2): void {
    const fighterSignal = fighter === 1 ? this.fighter1 : this.fighter2;
    const errorSignal = fighter === 1 ? this.fighter1Error : this.fighter2Error;
    const tierInfoSignal = fighter === 1 ? this.fighter1TierInfo : this.fighter2TierInfo;
    const loadingSignal = fighter === 1 ? this.isFetchingFighter1Tier : this.isFetchingFighter2Tier;
    const tierErrorSignal = fighter === 1 ? this.fighter1TierError : this.fighter2TierError;
    const debounceTimer = fighter === 1 ? 'fighter1TierDebounce' : 'fighter2TierDebounce';
    const imageSignal = fighter === 1 ? this.fighter1Image : this.fighter2Image;

    fighterSignal.set('');
    errorSignal.set(null);
    tierInfoSignal.set(null);
    loadingSignal.set(false);
    tierErrorSignal.set(null);
    imageSignal.set(null);
    this.battleResult.set(null);
    this.editingImageData.set(null);
    this.exploringLoreConnection.set(false);
    clearTimeout(this[debounceTimer]);
  }

  async getRandomBattle(): Promise<void> {
    if (this.isLoading() || this.isGettingRandom()) return;
    this.isGettingRandom.set(true);
    this.error.set(null);
    this.clearFighter(1);
    this.clearFighter(2);
    try {
      const matchup = await this.geminiService.getRandomMatchup();
      this.updateFighter({ value: matchup.fighter1 }, 1);
      this.updateFighter({ value: matchup.fighter2 }, 2);
    } catch (e) {
      console.error(e);
      this.error.set((e as Error).message);
    } finally {
      this.isGettingRandom.set(false);
    }
  }

  async showCharacterInfo(characterName: string): Promise<void> {
    if (this.isProfileLoading()) return;
    this.isProfileLoading.set(true);
    this.selectedCharacterProfile.set(null);
    this.profileError.set(null);
    try {
      const profile = await this.geminiService.getCharacterProfile(characterName);
      this.selectedCharacterProfile.set(profile);
    } catch (e) {
      console.error(e);
      this.profileError.set((e as Error).message);
      setTimeout(() => this.profileError.set(null), 5000);
    } finally {
      this.isProfileLoading.set(false);
    }
  }

  closeCharacterProfile(): void { this.selectedCharacterProfile.set(null); }

  cancelBattle(): void {
    if (!this.isLoading()) return;
    
    this.currentBattleId++; // Invalidate the ongoing battle promise chain
    this.isLoading.set(false);
    this.error.set(null);
  }

  async startBattle(): Promise<void> {
    this.validateFighter(this.fighter1, this.fighter1Error);
    this.validateFighter(this.fighter2, this.fighter2Error);

    if (this.fighter1Error() || this.fighter2Error() || this.isLoading() || this.cooldown() > 0 || !this.isBattleReady()) {
      return;
    }

    this.isLoading.set(true);
    this.battleResult.set(null);
    this.fighter1Image.set(null);
    this.fighter2Image.set(null);
    this.error.set(null);
    this.editingImageData.set(null);
    this.exploringLoreConnection.set(false);
    this.activeStatTab.set('chart');
    this.activeView.set('summary');
    this.expandedAnalysisSource.set(null);

    this.currentBattleId++;
    const battleId = this.currentBattleId;

    try {
      const result = await this.geminiService.getBattleResult(this.fighter1(), this.fighter2(), this.battlePath());
      
      if (battleId !== this.currentBattleId) return; // Battle was cancelled

      if (!result || !result.fighter1 || !result.fighter2 || !result.fighter1.stats || !result.fighter2.stats || !result.winner) {
        console.error("Incomplete battle result from AI:", result);
        throw new Error("The AI returned an incomplete analysis. Please try again.");
      }

      this.battleResult.set(result);
      this.saveBattleToHistory(result.fighter1.name, result.fighter2.name, result.winner);

      if (result.fighter1.imageSearchQuery) {
        this.geminiService.generateImage(result.fighter1.imageSearchQuery, this.aspectRatio(), this.imageStyle(), this.imageMood())
          .then(image => {
            if (battleId === this.currentBattleId) this.fighter1Image.set(image);
          })
          .catch(e => console.error('Fighter 1 image generation failed:', e));
      }
      
      if (result.fighter2.imageSearchQuery) {
        this.geminiService.generateImage(result.fighter2.imageSearchQuery, this.aspectRatio(), this.imageStyle(), this.imageMood())
          .then(image => {
             if (battleId === this.currentBattleId) this.fighter2Image.set(image);
          })
          .catch(e => console.error('Fighter 2 image generation failed:', e));
      }

    } catch (e) {
      if (battleId === this.currentBattleId) {
        console.error(e);
        const errorMessage = (e as Error).message || 'An epic clash of forces caused an error. Please try again.';
        this.error.set(errorMessage);
      }
    } finally {
      if (battleId === this.currentBattleId) {
        this.isLoading.set(false);
        this.startCooldown();
      }
    }
  }

  formatStatName(stat: string): string {
    return stat.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
  }
  
  setActiveStatTab(tab: 'chart' | 'table'): void {
    this.activeStatTab.set(tab);
  }

  highlightKeywords(text: string): SafeHtml {
    if (!text) return this.sanitizer.bypassSecurityTrustHtml('');

    const keywords: Record<string, string> = {
      // Powerful 'Hax' and Reality Bending
      'Reality Warping': 'bg-purple-200 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border border-purple-300 dark:border-purple-700',
      'Time Manipulation': 'bg-sky-200 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300 border border-sky-300 dark:border-sky-700',
      'Causality Manipulation': 'bg-rose-200 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700',
      'Hax': 'font-bold bg-rose-200 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700',
      'Power Nullification': 'bg-gray-400 text-gray-900 dark:bg-gray-600 dark:text-gray-100 border border-gray-500 dark:border-gray-500',
      'Resistance Negation': 'bg-orange-200 text-orange-800 dark:bg-orange-900/60 dark:text-orange-300 border border-orange-300 dark:border-orange-700',
      'Durability Negation': 'bg-red-300 text-red-900 dark:bg-red-800/60 dark:text-red-200 border border-red-400 dark:border-red-600',

      // Physical Abilities
      'Super Strength': 'bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-300 border border-red-300 dark:border-red-700',
      'Super Speed': 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700',
      'Invulnerability': 'bg-slate-300 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border border-slate-400 dark:border-slate-600',
      'Regeneration': 'bg-green-200 text-green-800 dark:bg-green-900/60 dark:text-green-300 border border-green-300 dark:border-green-700',
      'Immortality': 'bg-lime-200 text-lime-800 dark:bg-lime-900/60 dark:text-lime-300 border border-lime-300 dark:border-lime-700',
      'Flight': 'bg-blue-200 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-300 dark:border-blue-700',

      // Energy & Magic
      'Energy Projection': 'bg-amber-200 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700',
      'Magic': 'bg-indigo-200 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700',

      // Psionics & Movement
      'Telepathy': 'bg-violet-200 text-violet-800 dark:bg-violet-900/60 dark:text-violet-300 border border-violet-300 dark:border-violet-700',
      'Telekinesis': 'bg-fuchsia-200 text-fuchsia-800 dark:bg-fuchsia-900/60 dark:text-fuchsia-300 border border-fuchsia-300 dark:border-fuchsia-700',
      'Teleportation': 'bg-cyan-200 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700'
    };
    
    // Create a regex that is case-insensitive and matches whole words
    const keywordRegex = new RegExp(`\\b(${Object.keys(keywords).join('|')})\\b`, 'gi');
    
    const highlightedText = text.replace(keywordRegex, (match) => {
      // Find the original casing for the key to look up the class
      const originalKey = Object.keys(keywords).find(k => k.toLowerCase() === match.toLowerCase()) || match;
      const classes = keywords[originalKey];
      // The -translate-y-px helps with vertical alignment in the text flow
      return `<span class="inline-block px-1.5 py-0.5 rounded-md text-xs font-semibold leading-none align-baseline -translate-y-px ${classes}">${match}</span>`;
    });
    
    return this.sanitizer.bypassSecurityTrustHtml(highlightedText);
  }

  setView(view: 'summary' | 'stats' | 'tier' | 'analysis' | 'sources'): void {
    this.activeView.set(view);
  }

  toggleAnalysisSource(categoryKey: string): void {
    this.expandedAnalysisSource.update(current => 
      current === categoryKey ? null : categoryKey
    );
  }

  // Image Editor Methods
  openImageEditor(fighter: 1 | 2): void {
    const result = this.battleResult();
    if (!result) return;
    
    const fighterData = fighter === 1 ? result.fighter1 : result.fighter2;
    const fighterImage = fighter === 1 ? this.fighter1Image() : this.fighter2Image();
    
    if (!fighterData || !fighterImage) return;

    this.editingImageData.set({
      url: fighterImage,
      originalQuery: fighterData.imageSearchQuery,
      fighterName: fighterData.name,
      aspectRatio: this.aspectRatio(),
      imageStyle: this.imageStyle(),
      imageMood: this.imageMood(),
    });
  }
  
  closeImageEditor(): void {
    this.editingImageData.set(null);
  }
  
  handleImageUpdate(newImageUrl: string): void {
    const editingData = this.editingImageData();
    if (!editingData) return;

    const result = this.battleResult();
    if (result?.fighter1?.name === editingData.fighterName) {
      this.fighter1Image.set(newImageUrl);
    } else if (result?.fighter2?.name === editingData.fighterName) {
      this.fighter2Image.set(newImageUrl);
    }
  }

  // Lore Connections Methods
  closeLoreConnection(): void {
    this.exploringLoreConnection.set(false);
  }

  async exploreLoreConnection(): Promise<void> {
    if (!this.fighter1() || !this.fighter2()) return;
    this.exploringLoreConnection.set(true);
    this.isLoreConnectionLoading.set(true);
    this.loreConnectionData.set(null);
    this.loreConnectionError.set(null);

    try {
      const connections = await this.geminiService.getLoreConnections(this.fighter1(), this.fighter2());
      this.loreConnectionData.set(connections);
    } catch(e) {
      this.loreConnectionError.set((e as Error).message);
    } finally {
      this.isLoreConnectionLoading.set(false);
    }
  }
  
  // Character Lore Methods
  async showCharacterLore(characterName: string): Promise<void> {
    if (this.isCharacterLoreLoading()) return;
    this.isCharacterLoreLoading.set(true);
    this.selectedCharacterLore.set(null);
    this.characterLoreError.set(null);
    try {
      const lore = await this.geminiService.getCharacterLore(characterName);
      this.selectedCharacterLore.set(lore);
    } catch (e) {
      console.error(e);
      this.characterLoreError.set((e as Error).message);
      setTimeout(() => this.characterLoreError.set(null), 5000);
    } finally {
      this.isCharacterLoreLoading.set(false);
    }
  }

  closeCharacterLore(): void {
    this.selectedCharacterLore.set(null);
  }

  // Battle History Methods
  private loadHistory(): void {
    try {
      const historyJson = localStorage.getItem('cosmic-clash-history');
      if (historyJson) {
        const history = JSON.parse(historyJson) as BattleHistoryEntry[];
        this.battleHistory.set(history);
      }
    } catch (e) {
      console.warn('Could not load battle history from localStorage.', e);
      this.battleHistory.set([]);
    }
  }

  private saveBattleToHistory(fighter1: string, fighter2: string, winner: string): void {
    const newEntry: BattleHistoryEntry = {
      id: self.crypto.randomUUID(),
      fighter1,
      fighter2,
      winner,
      timestamp: Date.now()
    };

    this.battleHistory.update(history => {
      const newHistory = [newEntry, ...history];
      // Keep only the last 20 entries
      if (newHistory.length > 20) {
        newHistory.length = 20;
      }
      try {
        localStorage.setItem('cosmic-clash-history', JSON.stringify(newHistory));
      } catch (e) {
        console.warn('Could not save battle history to localStorage.', e);
      }
      return newHistory;
    });
  }

  toggleHistory(): void {
    this.showHistory.update(v => !v);
  }

  rerunBattle(entry: BattleHistoryEntry): void {
    this.updateFighter({ value: entry.fighter1 }, 1);
    this.updateFighter({ value: entry.fighter2 }, 2);
    this.showHistory.set(false);
  }

  clearHistory(): void {
    // Using native confirm for simplicity in this context.
    if (confirm('Are you sure you want to clear your entire battle history? This cannot be undone.')) {
      this.battleHistory.set([]);
      try {
        localStorage.removeItem('cosmic-clash-history');
      } catch (e) {
        console.warn('Could not remove battle history from localStorage.', e);
      }
    }
  }

  exportResults(): void {
    const result = this.battleResult();
    const tier1 = this.fighter1TierInfo();
    const tier2 = this.fighter2TierInfo();

    if (!result || !tier1 || !tier2) {
      console.error('Cannot export results: battle data is incomplete.');
      // In a real app, you might want to show a user-facing error.
      return;
    }

    // Compile a comprehensive object with all battle data.
    const exportData = {
      battleSummary: {
        fighter1: result.fighter1.name,
        fighter2: result.fighter2.name,
        winner: result.winner,
        confidence: result.confidence,
        confidenceScore: result.confidenceScore,
        verdict: result.verdictSummary,
      },
      battleAnalysis: result.analysis,
      nlfConsiderations: result.nlfConsiderations,
      fighter1Details: {
        name: result.fighter1.name,
        tierInfo: tier1,
        stats: result.fighter1.stats,
      },
      fighter2Details: {
        name: result.fighter2.name,
        tierInfo: tier2,
        stats: result.fighter2.stats,
      },
      sources: result.sources,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    // Sanitize fighter names for a clean filename.
    const f1Name = result.fighter1.name.toLowerCase().replace(/[\s()]/g, '_').replace(/[^a-z0-9_]/g, '');
    const f2Name = result.fighter2.name.toLowerCase().replace(/[\s()]/g, '_').replace(/[^a-z0-9_]/g, '');
    
    a.href = url;
    a.download = `cosmic_clash_${f1Name}_vs_${f2Name}.json`;
    
    document.body.appendChild(a);
    a.click();
    
    // Clean up the created elements and URL.
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  getAbilitiesByCategory(abilities: TierNegatingAbility[] | undefined, category: string): TierNegatingAbility[] {
    if (!abilities) {
      return [];
    }
    return abilities.filter(a => a.category === category);
  }

  getTierBadgeClasses(tierValue: number): string {
    if (tierValue === 0) { // Boundless
      return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-600';
    }
    if (tierValue >= 1 && tierValue < 3) { // Universal/Multiversal
      return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-600';
    }
    if (tierValue >= 3 && tierValue < 6) { // Cosmic/Galactic
      return 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-600';
    }
    // Mortal/Planetary and others
    return 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/50 dark:text-sky-300 dark:border-sky-600';
  }

  getTierDescription(tierValue: number): string {
    if (tierValue === 0) {
      return 'Boundless: Beings who are beyond all concepts of space, time, and dimensionality, possessing true omnipotence or its equivalent.';
    }
    if (tierValue >= 1 && tierValue < 3) {
      return 'Universal / Multiversal: Capable of creating, destroying, or significantly affecting structures on the scale of a single universe or multiple universes.';
    }
    if (tierValue >= 3 && tierValue < 6) {
      return 'Cosmic / Galactic: Power to destroy or create galaxies, solar systems, or other large-scale cosmic structures.';
    }
    if (tierValue >= 6) {
      return 'Mortal / Planetary: Power ranging from the ability to destroy planets down to continents, islands, or cities.';
    }
    return 'Tier could not be determined.';
  }
}