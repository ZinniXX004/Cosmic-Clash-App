import { Component, ChangeDetectionStrategy, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-intro',
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 bg-slate-900 text-slate-200 font-sans p-4 sm:p-6 md:p-8 flex items-center justify-center animate-fade-in-fast">
      <div class="w-full max-w-4xl max-h-[95vh] bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-2xl shadow-indigo-500/10 flex flex-col">
        <header class="p-6 text-center border-b border-slate-700">
          <h1 class="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 pb-2">
            Welcome to Cosmic Clash
          </h1>
          <p class="text-lg text-slate-400">The Ultimate AI Battle Simulator</p>
        </header>
        
        <main class="p-6 sm:p-8 overflow-y-auto space-y-8">
          <section class="animate-fade-in-up" style="animation-delay: 0.1s;">
            <h2 class="text-2xl font-bold mb-3 text-cyan-400">What is Cosmic Clash?</h2>
            <p class="text-slate-300 leading-relaxed">
              Cosmic Clash is an AI-powered simulator that pits any two fictional characters against each other in a hypothetical battle. Using Google's advanced Gemini AI, it analyzes their powers, abilities, and feats based on established lore to determine the ultimate winner.
            </p>
          </section>

          <section class="animate-fade-in-up" style="animation-delay: 0.2s;">
            <h2 class="text-2xl font-bold mb-3 text-cyan-400">The Art of Powerscaling</h2>
            <p class="text-slate-300 leading-relaxed">
              Powerscaling is the fan-driven practice of comparing character strengths across different fictional universes. It involves analyzing "feats"—their greatest demonstrated achievements—to establish a hierarchy of power. This app uses a tiering system inspired by communities like the VS Battles Wiki to bring a structured, analytical approach to these classic "who would win?" debates.
            </p>
          </section>

          <section class="animate-fade-in-up" style="animation-delay: 0.3s;">
            <h2 class="text-2xl font-bold mb-3 text-cyan-400">How to Battle</h2>
            <ol class="list-decimal list-inside space-y-2 text-slate-300 pl-2">
              <li><span class="font-semibold text-white">Enter Challengers:</span> Type the names of any two characters you can imagine.</li>
              <li><span class="font-semibold text-white">Analyze Tiers:</span> The AI will assess each character's power level and display their tier.</li>
              <li><span class="font-semibold text-white">Start the Clash:</span> Click the "BATTLE!" button to receive a detailed fight analysis.</li>
            </ol>
          </section>
          
          <section class="animate-fade-in-up" style="animation-delay: 0.4s;">
            <h2 class="text-2xl font-bold mb-3 text-cyan-400">Key Features</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-center">
              <div class="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                <h3 class="font-semibold text-indigo-300">Advanced AI Analysis</h3>
                <p class="text-sm text-slate-400 mt-1">Powered by Gemini for nuanced and detailed battle verdicts.</p>
              </div>
              <div class="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                <h3 class="font-semibold text-indigo-300">Powerscaling Tiers</h3>
                <p class="text-sm text-slate-400 mt-1">Automatic tier analysis for each character before the battle.</p>
              </div>
              <div class="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                <h3 class="font-semibold text-indigo-300">AI-Generated Art</h3>
                <p class="text-sm text-slate-400 mt-1">Unique, dynamic images created for each combatant.</p>
              </div>
              <div class="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                <h3 class="font-semibold text-indigo-300">Character Profiles</h3>
                <p class="text-sm text-slate-400 mt-1">Get detailed summaries of a character's powers and history.</p>
              </div>
               <div class="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                <h3 class="font-semibold text-indigo-300">Detailed Stats</h3>
                <p class="text-sm text-slate-400 mt-1">Compare fighters with a radar chart and stats table.</p>
              </div>
              <div class="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                <h3 class="font-semibold text-indigo-300">Lore Connections</h3>
                <p class="text-sm text-slate-400 mt-1">Discover if your chosen characters have ever met in lore.</p>
              </div>
            </div>
          </section>
          
           <div class="text-center text-xs text-slate-500 pt-4 animate-fade-in-up" style="animation-delay: 0.5s;">
              <p class="font-semibold">Disclaimer:</p>
              <p>This is for entertainment purposes only. The AI's analysis is a fun, hypothetical interpretation of fictional characters and is not a canonical fact.</p>
           </div>
        </main>

        <footer class="p-6 border-t border-slate-700 text-center flex-shrink-0">
           <button (click)="enter.emit()" class="text-xl font-bold px-10 py-4 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/30
               hover:from-indigo-600 hover:to-cyan-600 transform hover:scale-105 transition-all duration-300 ease-in-out">
              Enter the Arena
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
      animation: fadeIn 0.5s ease-in-out forwards;
    }
     .animate-fade-in-up {
      animation: fadeInUp 0.5s ease-in-out forwards;
      opacity: 0;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntroComponent {
  enter = output<void>();
}