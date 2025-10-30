import { Component, ChangeDetectionStrategy, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';

export interface ImageEditData {
  url: string;
  originalQuery: string;
  fighterName: string;
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  imageStyle: string;
  imageMood: string;
}

@Component({
  selector: 'app-image-editor',
  template: `
    <div class="fixed inset-0 bg-white/80 dark:bg-slate-900/90 backdrop-blur-sm z-[70] animate-fade-in-fast" (click)="close.emit()"></div>
    <div class="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl shadow-indigo-500/10 flex flex-col animate-fade-in-up">
        <header class="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h2 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-500">
            Edit Image: {{ editData().fighterName }}
          </h2>
          <button (click)="close.emit()" class="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" aria-label="Close image editor">
            <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        
        <main class="p-6 flex flex-col md:flex-row gap-6">
          <div class="md:w-1/2">
            <img [src]="editData().url" [alt]="'Current image of ' + editData().fighterName" class="rounded-lg shadow-md w-full" [style.aspect-ratio]="editData().aspectRatio.replace(':', ' / ')">
          </div>
          <div class="md:w-1/2 flex flex-col gap-4">
            <div>
              <label for="editPrompt" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Editing Prompt</label>
              <textarea id="editPrompt" rows="4" [value]="editPrompt()" (input)="editPrompt.set($any($event.target).value)" placeholder="e.g., Add a retro filter, make the background a cosmic nebula..." class="w-full bg-slate-100 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-lg p-3 text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition"></textarea>
            </div>
            @if(error()) {
                <p class="text-sm text-red-500">{{ error() }}</p>
            }
          </div>
        </main>

        <footer class="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end items-center gap-4">
           <button (click)="close.emit()" class="px-6 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-300 dark:hover:bg-slate-500 transition">
              Cancel
            </button>
           <button (click)="applyEdit()" [disabled]="isLoading() || !editPrompt().trim()" class="px-6 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-600/30 hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition disabled:opacity-50 disabled:scale-100">
              @if(isLoading()) {
                <div class="flex items-center justify-center gap-2 w-28">
                  <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>Applying...</span>
                </div>
              } @else {
                <span class="w-28">Apply Edit</span>
              }
            </button>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }
    .animate-fade-in-fast {
      animation: fadeIn 0.2s ease-in-out forwards;
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
export class ImageEditorComponent {
  editData = input.required<ImageEditData>();
  close = output<void>();
  imageUpdated = output<string>();

  private geminiService = inject(GeminiService);
  
  editPrompt = signal('');
  isLoading = signal(false);
  error = signal<string | null>(null);

  async applyEdit(): Promise<void> {
    if (!this.editPrompt().trim() || this.isLoading()) return;
    
    this.isLoading.set(true);
    this.error.set(null);
    const data = this.editData();

    try {
      const newImageUrl = await this.geminiService.editImage(
        data.originalQuery, 
        this.editPrompt(), 
        data.aspectRatio,
        data.imageStyle,
        data.imageMood
      );
      this.imageUpdated.emit(newImageUrl);
      this.close.emit();
    } catch (e) {
      this.error.set((e as Error).message);
      console.error(e);
    } finally {
      this.isLoading.set(false);
    }
  }
}