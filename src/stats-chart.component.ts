import { Component, ChangeDetectionStrategy, input, output, ElementRef, viewChild, AfterViewInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';
import { FighterStats } from './services/gemini.service';

export interface FighterData {
  name: string;
  stats: FighterStats;
}

@Component({
  selector: 'app-stats-chart',
  template: `<div #chart class="relative w-full h-96 sm:h-[450px] bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 overflow-visible"></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class StatsChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  chartContainer = viewChild.required<ElementRef<HTMLDivElement>>('chart');
  
  fighter1 = input.required<FighterData>();
  fighter2 = input.required<FighterData>();
  theme = input.required<'dark' | 'light'>();
  characterClick = output<string>();

  private resizeObserver: ResizeObserver | null = null;
  private readonly statDescriptions: Record<keyof FighterStats, string> = {
    strength: 'Physical power and lifting/striking capability.',
    speed: 'Combat, reaction, and travel speed.',
    durability: 'Ability to withstand physical damage and trauma.',
    intelligence: 'Tactical and strategic thinking, knowledge, and ingenuity.',
    energyProjection: 'Power and control over energy-based attacks (beams, blasts, etc.).',
    fightingSkills: 'Proficiency in hand-to-hand combat and martial arts.',
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (this.chartContainer()?.nativeElement && (changes['fighter1'] || changes['fighter2'] || changes['theme'])) {
      this.createChart();
    }
  }

  ngAfterViewInit(): void {
    this.resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => this.createChart());
    });
    this.resizeObserver.observe(this.chartContainer().nativeElement);
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private formatStatName(stat: string): string {
    return stat.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
  }

  private createChart(): void {
    const f1 = this.fighter1();
    const f2 = this.fighter2();
    const currentTheme = this.theme();
    const element = this.chartContainer().nativeElement;

    if (!element) return;

    d3.select(element).select('svg').remove();
    d3.select(element).select('.chart-tooltip').remove();

    const isDark = currentTheme === 'dark';
    const gridStrokeColor = isDark ? "#334155" : "#e2e8f0";
    const gridFillColor = isDark ? "#1e293b" : "#f1f5f9";
    const axisLineColor = isDark ? "#475569" : "#cbd5e1";
    const axisTextColor = isDark ? "#cbd5e1" : "#475569";
    const legendTextColor = isDark ? "#cbd5e1" : "#334155";
    const tooltipBgColor = isDark ? "rgba(30, 41, 59, 0.95)" : "rgba(255, 255, 255, 0.95)";
    const tooltipBorderColor = isDark ? "#475569" : "#cbd5e1";
    const tooltipTextColor = isDark ? "#e2e8f0" : "#1e293b";
    const pointStrokeColor = isDark ? "#f8fafc" : "#1e293b";

    const statsOrder: (keyof FighterStats)[] = ['strength', 'speed', 'durability', 'intelligence', 'energyProjection', 'fightingSkills'];
    const data = [
      statsOrder.map(key => ({ axis: this.formatStatName(key), value: f1.stats[key] })),
      statsOrder.map(key => ({ axis: this.formatStatName(key), value: f2.stats[key] }))
    ];

    const containerWidth = element.clientWidth;
    const isMobile = containerWidth < 500;

    const margin = isMobile 
      ? { top: 60, right: 40, bottom: 60, left: 40 }
      : { top: 80, right: 100, bottom: 80, left: 100 };

    const axisLabelFontSize = isMobile ? '10px' : '12px';
    const legendFontSize = isMobile ? 11 : 12;
    const labelFactor = isMobile ? 1.1 : 1.15;

    const width = containerWidth - margin.left - margin.right;
    const height = element.clientHeight - margin.top - margin.bottom;
    const radius = Math.min(width, height) / 2;
    
    const color = d3.scaleOrdinal<string>().range(["#22c55e", "#38bdf8"]);
    
    const maxValue = Math.max(100, d3.max(data, d => d3.max(d, i => i.value)) || 0);
    const rScale = d3.scaleLinear().range([0, radius]).domain([0, maxValue]);
    const angleSlice = Math.PI * 2 / statsOrder.length;
    const levels = 5;

    const svg = d3.select(element).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${width / 2 + margin.left}, ${height / 2 + margin.top})`);

    const axisGrid = svg.append("g").attr("class", "axisWrapper");
    axisGrid.selectAll(".levels")
      .data(d3.range(1, levels + 1).reverse())
      .enter()
      .append("polygon")
      .attr("points", (d) => {
        const levelFactor = radius * (d / levels);
        return statsOrder.map((_stat, i) => `${levelFactor * Math.cos(angleSlice * i - Math.PI / 2)},${levelFactor * Math.sin(angleSlice * i - Math.PI / 2)}`).join(" ");
      })
      .style("fill", gridFillColor)
      .style("stroke", gridStrokeColor)
      .style("fill-opacity", 0.7);

    axisGrid.selectAll(".axisLabel")
      .data(d3.range(1, levels + 1))
      .enter().append("text")
      .attr("class", "axisLabel")
      .attr("x", 4)
      .attr("y", d => -(d * radius / levels))
      .attr("dy", "0.4em")
      .style("font-size", isMobile ? "8px" : "10px")
      .style("fill", axisTextColor)
      .text(d => Math.round(maxValue * d / levels).toString());

    const axis = axisGrid.selectAll(".axis")
      .data(statsOrder)
      .enter()
      .append("g")
      .attr("class", "axis");

    axis.append("line")
      .attr("x1", 0).attr("y1", 0)
      .attr("x2", (d, i) => rScale(maxValue) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr("y2", (d, i) => rScale(maxValue) * Math.sin(angleSlice * i - Math.PI / 2))
      .style("stroke", axisLineColor).style("stroke-width", "1px");

    axis.append("text")
      .attr("class", "legend")
      .style("font-size", axisLabelFontSize)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("x", (d, i) => rScale(maxValue * labelFactor) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr("y", (d, i) => rScale(maxValue * labelFactor) * Math.sin(angleSlice * i - Math.PI / 2))
      .text(d => this.formatStatName(d))
      .style("fill", axisTextColor);

    const radarLine = d3.lineRadial<{ axis: string, value: number }>()
      .curve(d3.curveLinearClosed)
      .radius(d => rScale(d.value))
      .angle((d, i) => i * angleSlice);

    const blobWrapper = svg.selectAll(".radarWrapper")
      .data(data)
      .enter().append("g")
      .attr("class", "radarWrapper");

    // Animate the radar areas (blobs)
    blobWrapper.append("path")
      .attr("class", "radarArea")
      .attr("d", d => radarLine(d.map(p => ({...p, value: 0})))) // Start from the center
      .style("fill", (d, i) => color(i.toString()))
      .style("fill-opacity", 0.5)
      .transition()
      .duration(800)
      .ease(d3.easeCubicOut)
      .attr("d", d => radarLine(d));

    // Animate the radar strokes
    blobWrapper.append("path")
      .attr("class", "radarStroke")
      .attr("d", d => radarLine(d.map(p => ({...p, value: 0})))) // Start from the center
      .style("stroke-width", "2px")
      .style("stroke", (d, i) => color(i.toString()))
      .style("fill", "none")
      .transition()
      .duration(800)
      .ease(d3.easeCubicOut)
      .attr("d", d => radarLine(d));

    const tooltip = d3.select(element)
      .append("div")
      .attr("class", "chart-tooltip")
      .style("position", "absolute")
      .style("background", tooltipBgColor)
      .style("border", `1px solid ${tooltipBorderColor}`)
      .style("color", tooltipTextColor)
      .style("padding", "8px 12px")
      .style("border-radius", "6px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("font-size", "14px")
      .style("transition", "opacity 0.2s ease-in-out");

    const circles = blobWrapper.selectAll(".radarCircle")
      .data((fighterData, fighterIndex) => 
        fighterData.map((point, pointIndex) => ({ ...point, fighterIndex, pointIndex }))
      )
      .enter().append("circle")
      .attr("class", "radarCircle")
      .attr("r", 0) // Animate from 0
      .attr("cx", (d, i) => rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr("cy", (d, i) => rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2))
      .style("fill", d => color(d.fighterIndex.toString()))
      .style("stroke", pointStrokeColor)
      .style("stroke-width", (d, i) => {
        const statKey = statsOrder[i];
        const f1Stat = f1.stats[statKey];
        const f2Stat = f2.stats[statKey];
        const hasAdvantage = (d.fighterIndex === 0 && f1Stat > f2Stat) || (d.fighterIndex === 1 && f2Stat > f1Stat);
        return hasAdvantage ? "2.5px" : "1.5px";
      })
      .style("cursor", "pointer")
      .on('mouseover', () => {
        tooltip.style('opacity', 1);
      })
      .on('mousemove', (event, d) => {
        const statIndex = d.pointIndex;
        const statKey = statsOrder[statIndex];
        const statName = d.axis;
        const f1Value = f1.stats[statKey];
        const f2Value = f2.stats[statKey];
        const statDescription = this.statDescriptions[statKey];
        const descriptionColor = isDark ? '#94a3b8' : '#64748b'; // slate-400 dark, slate-500 light

        const tooltipHtml = `
          <div style="font-weight: bold; font-size: 1rem; margin-bottom: 0.25rem; text-align: center;">${statName}</div>
          <p style="font-size: 0.75rem; color: ${descriptionColor}; text-align: center; margin-bottom: 0.75rem; max-width: 14rem; font-style: italic;">
            ${statDescription}
          </p>
          <div style="display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem; width: 14rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="display: flex; align-items: center; gap: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                <span style="width: 0.75rem; height: 0.75rem; border-radius: 9999px; flex-shrink: 0; background-color: ${color('0')}"></span>
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${f1.name}">${f1.name}</span>
              </span>
              <span style="font-weight: 600;">${f1Value}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="display: flex; align-items: center; gap: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                <span style="width: 0.75rem; height: 0.75rem; border-radius: 9999px; flex-shrink: 0; background-color: ${color('1')}"></span>
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${f2.name}">${f2.name}</span>
              </span>
              <span style="font-weight: 600;">${f2Value}</span>
            </div>
          </div>
        `;

        const [x, y] = d3.pointer(event, element);
        tooltip
          .html(tooltipHtml)
          .style('left', `${x + 15}px`)
          .style('top', `${y}px`);
      })
      .on('mouseout', () => {
        tooltip.style('opacity', 0);
      });

    circles.transition()
      .duration(400)
      .delay((d,i) => i * 50)
      .attr("r", (d, i) => {
        const statKey = statsOrder[i];
        const f1Stat = f1.stats[statKey];
        const f2Stat = f2.stats[statKey];
        const hasAdvantage = (d.fighterIndex === 0 && f1Stat > f2Stat) || (d.fighterIndex === 1 && f2Stat > f1Stat);
        return hasAdvantage ? 7 : 5;
      });

    const legendNames = [f1.name, f2.name];
    const legend = svg.append("g")
      .attr("font-family", "sans-serif")
      .attr("font-size", legendFontSize)
      .attr("text-anchor", "start")
      .selectAll("g")
      .data(legendNames)
      .join("g")
      .attr("transform", (d, i) => `translate(${-width / 2}, ${-height / 2 - margin.top / 2 + i * (isMobile ? 20 : 25)})`);
      
    legend.append("rect")
      .attr("x", 0)
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", (d, i) => color(i.toString()));
      
    legend.append("text")
      .attr("x", 20)
      .attr("y", 9)
      .attr("dy", "0em")
      .text(d => d)
      .style("fill", legendTextColor)
      .style("cursor", "pointer")
      .on("click", (event, d) => this.characterClick.emit(d as string));
  }
}
