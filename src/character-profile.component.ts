import { Component, ChangeDetectionStrategy, input, output, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CharacterProfile, GeminiService } from './services/gemini.service';

@Component({
  selector: 'app-character-profile',
  template: `
    <div class="fixed inset-0 bg-white/80 dark:bg-slate-900/90 backdrop-blur-sm z-50 animate-fade-in-fast" (click)="close.emit()"></div>
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-2xl shadow-indigo-500/10 flex flex-col animate-fade-in-up">
        <header class="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
          <h2 class="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-500 dark:from-indigo-400 dark:to-cyan-400">
            {{ characterProfile().name }}
          </h2>
          <button (click)="close.emit()" class="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" aria-label="Close character profile">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <main class="p-6 sm:p-8 overflow-y-auto text-slate-600 dark:text-slate-300">
          <div class="flex flex-col sm:flex-row gap-6 sm:gap-8 mb-8">
            <div class="sm:w-1/3 flex-shrink-0">
              <div class="relative aspect-[3/4] bg-slate-200 dark:bg-slate-700 rounded-xl shadow-lg">
                @if (isLoadingImage()) {
                  <div class="absolute inset-0 animate-pulse bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                }
                @if (image(); as imgUrl) {
                  <img [src]="imgUrl"
                       [alt]="'Image of ' + characterProfile().name"
                       class="absolute inset-0 w-full h-full rounded-xl object-cover animate-fade-in-fast">
                } @else if(imageError(); as error) {
                  <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-2 text-red-500 dark:text-red-400">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mb-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                    <p class="text-xs font-semibold">Image Failed</p>
                    <p class="text-xs">{{ error }}</p>
                  </div>
                }
              </div>
            </div>
            <div class="sm:w-2/3">
              <section>
                <h3 class="text-xl font-semibold text-cyan-600 dark:text-cyan-400 mb-2">Summary</h3>
                <p class="leading-relaxed whitespace-pre-wrap">
                  {{ characterProfile().summary }}
                </p>
              </section>

              @if (characterProfile().archetypes && characterProfile().archetypes.length > 0) {
                <section class="mt-6">
                  <h3 class="text-xl font-semibold text-cyan-600 dark:text-cyan-400 mb-3">Character Archetypes</h3>
                  <div class="flex flex-wrap gap-2">
                    @for (archetype of characterProfile().archetypes; track archetype) {
                      <span class="px-3 py-1 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700">
                        {{ archetype }}
                      </span>
                    }
                  </div>
                </section>
              }
            </div>
          </div>

          <section>
            <h3 class="text-xl font-semibold text-cyan-600 dark:text-cyan-400 mb-3">Key Abilities</h3>
            <div class="space-y-4">
              @for(ability of characterProfile().abilities; track ability.name) {
                <div class="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 class="font-bold text-indigo-600 dark:text-indigo-400 text-lg">{{ ability.name }}</h4>
                  <p class="text-slate-500 dark:text-slate-400 mt-1">{{ ability.description }}</p>
                </div>
              }
            </div>
          </section>

          @if (characterProfile().sources && characterProfile().sources!.length > 0) {
            <section class="mt-8">
              <h3 class="text-xl font-semibold text-cyan-600 dark:text-cyan-400 mb-3">Sources</h3>
              <ul class="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300">
                @for(source of characterProfile().sources; track source.web.uri) {
                  <li>
                    <a [href]="source.web.uri" target="_blank" rel="noopener noreferrer" class="text-indigo-500 dark:text-indigo-400 hover:underline break-words">{{ source.web.title || source.web.uri }}</a>
                  </li>
                }
              </ul>
            </section>
          }
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }
    .animate-fade-in-fast {
      animation: fadeIn 0.3s ease-in-out forwards;
    }
    .animate-fade-in-up {
      animation: fadeInUp 0.3s ease-in-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class CharacterProfileComponent {
  characterProfile = input.required<CharacterProfile>();
  close = output<void>();
  imageStyle = input<string>('default');
  imageMood = input<string>('default');

  private geminiService = inject(GeminiService);

  image = signal<string | null>(null);
  isLoadingImage = signal(true);
  imageError = signal<string | null>(null);

  constructor() {
    effect(async () => {
      const profile = this.characterProfile();
      if (profile) {
        this.isLoadingImage.set(true);
        this.image.set(null);
        this.imageError.set(null);
        try {
          const imageUrl = await this.geminiService.generateImage(profile.imageSearchQuery, '3:4', this.imageStyle(), this.imageMood());
          this.image.set(imageUrl);
        } catch (e) {
          console.error('Failed to generate profile image:', e);
          this.imageError.set((e as Error).message);
        } finally {
          this.isLoadingImage.set(false);
        }
      }
    });
  }
}