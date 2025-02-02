import { memo, useCallback, useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface LineChartProps {
    xData: number[];
    yData: number[];
    ratio?: number;
    height?: number | string;
    title?: string;
    isXAxisVisible?: boolean;
    isYAxisVisible?: boolean;
    isBrush?: boolean;
    onBrush?: (start: number, end: number) => void;
    brushPosition?: [number, number];
    isFill?: boolean;
    range?: [number, number];
    split?: number[];
    isSplitMask?: boolean;
    isZoom?: boolean;
    xFormat?: (d: number) => string;
}

function LineChart({ xData, yData, ratio, title = "", isXAxisVisible = false, isYAxisVisible = false, isBrush = false, isFill = false, onBrush, range, height, split, isSplitMask = false, brushPosition, isZoom = false, xFormat }: LineChartProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    const draw = useCallback(() => {
        if (!svgRef.current || !xData || !yData || xData.length === 0 || yData.length === 0) return;

        let timeStampData = range ? xData.slice(range?.[0], range?.[1] + 1) : xData;
        let valueData = range ? yData.slice(range?.[0], range?.[1] + 1) : yData;
        let data = timeStampData.map((x, i) => [x, valueData[i]] as [number, number]);

        const margin = { top: isXAxisVisible ? 20 : 0, right: isYAxisVisible ? 40 : 0, bottom: isXAxisVisible ? 30 : 0, left: isYAxisVisible ? 40 : 0 };
        const svg = d3.select(svgRef.current);
        const width = Math.max(10, svgRef.current.clientWidth - margin.left - margin.right);
        let iHeight: number = typeof height === 'string' ? svgRef.current.clientHeight * parseFloat(height) / 100 : height ?? 200;
        iHeight -= margin.top + margin.bottom;
        const xMin = d3.min(timeStampData)!;
        const xMax = d3.max(timeStampData)!;
        const yMin = d3.min(valueData)!;
        const yMax = d3.max(valueData)!;
        const xRange = Math.max(1, xMax - xMin);
        const yRange = Math.max(1, yMax - yMin);
        const xScale = [xMin, xMax];
        const yScale = [yMin, yMax];
        let innerWidth = width;
        let innerHeight: number = 0;
        if (height && ratio) {
            const yUnitPixel = iHeight / yRange;
            const xUnitPixel = yUnitPixel * ratio;
            innerWidth = xUnitPixel * xRange / 1000;
            if (innerWidth > width) {
                const scale = width / innerWidth;
                const delta = yRange / scale - yRange;
                yScale[0] -= delta / 2;
                yScale[1] += delta / 2;
            } else {
                const scale = width / innerWidth;
                const delta = xRange * scale - xRange;
                xScale[0] -= delta / 2;
                xScale[1] += delta / 2;
                const extentData = xData.map((d, i) => [d * 1000, i]).filter((v) => v[0] >= xScale[0] && v[0] <= xScale[1]);
                timeStampData = extentData.map((v) => v[0]);
                valueData = extentData.map((v) => yData[v[1]]);
                data = timeStampData.map((x, i) => [x, valueData[i]] as [number, number]);
            }
            innerHeight = iHeight;
            innerWidth = width;
            svg.attr("width", innerWidth + margin.left + margin.right);
        } else if (ratio) {
            const xUnitPixel = width / xRange;
            const yUnitPixel = xUnitPixel / ratio;
            innerHeight = yRange * yUnitPixel * 1000;
        } else {
            innerHeight = iHeight;
        }
        const outerHeight = innerHeight + margin.top + margin.bottom;

        svg.attr('height', outerHeight);

        const x = d3.scaleLinear()
            .domain(xScale)
            .range([0, innerWidth]);

        const y = d3.scaleLinear()
            .domain(yScale)
            .range([innerHeight, 0]);

        const lineGenerator = d3.line<[number, number]>()
            .x((d) => x(d[0]))
            .y((d) => y(d[1]));

        svg.selectAll('*').remove();

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        if (isZoom) {
            const zoom = d3.zoom<SVGGElement, unknown>().on("zoom", (event) => {
                g.attr("transform", event.transform);
            });
            g.call(zoom);
        }

        g.append('text')
            .attr('x', 10)
            .attr('y', 10)
            .attr('text-anchor', 'start')
            .attr('font-size', '16px')
            .attr('font-weight', 'bold')
            .text(title);

        if (isXAxisVisible) {
            const xAxis = d3.axisBottom(x).tickValues([...new Set([xMin, xMax, ...xScale])])
            if (xFormat) {
                xAxis.tickFormat((d) => xFormat && xFormat(d.valueOf()));
            }
            g.append('g')
                .attr('transform', `translate(0,${innerHeight})`)
                .call(xAxis);
        }

        if (isYAxisVisible) {
            const yAxis = d3.axisLeft(y).tickValues([...new Set([yMin, yMax, ...yScale])]);
            g.append('g').call(yAxis);
        }

        svg.append("defs")
            .append("clipPath")
            .attr("id", "clip-path")
            .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", innerWidth)
            .attr("height", innerHeight);

        if (range && range[0] !== range[1] || !range)
            g.append('path')
                .datum(timeStampData.map((t, i) => [t, valueData[i]] as [number, number]))
                .attr('d', lineGenerator)
                .attr('fill', 'none')
                .attr('stroke', '#82C4FF')
                .attr("clip-path", `url(#clip-path)`)
                .attr('stroke-width', 1);

        const areaGenerator = d3.area<[number, number]>()
            .x(d => x(d[0]))
            .y0(y(yMin))
            .y1(d => y(d[1]));

        if (isFill) {
            g.append("path")
                .datum(data)
                .attr("d", areaGenerator)
                .attr("fill", "#82C4FF99");
        }

        if (split && timeStampData.length > 2) {
            for (let i = 0; i < split.length - 1; i++) {
                const x1 = x(xData[split[i]] * 1000)
                const x2 = x(xData[split[i + 1]] * 1000)
                const y1 = y(yData[split[i]])
                const y2 = y(yData[split[i + 1]]);
                const line = g.append('line')
                    .attr('class', 'split-line')
                    .attr('x1', x1)
                    .attr('x2', x2)
                    .attr('y1', y1)
                    .attr('y2', y2)
                    .attr('stroke', y1 > y2 ? 'red' : 'green')
                    .attr('stroke-opacity', '0.5')
                    .attr('stroke-width', 1);
                if (isSplitMask) {
                    line.attr("clip-path", "url(#clip-path)")
                }
            }
        }

        if (range) {
            g.append('rect')
                .attr('x', x(xMin))
                .attr('y', 0)
                .attr('width', x(xMax) - x(xMin))
                .attr('height', innerHeight)
                .attr('fill', '#3331');
        }

        if (isBrush) {
            function brushFn(event: d3.D3BrushEvent<[number, number]>) {
                svg.select(".area").remove();
                const selection = event.selection;
                if (!selection) return;
                const [x0, x1] = selection;
                const [minX, maxX] = [x.invert(x0 as number), x.invert(x1 as number)];
                const filteredIndices = data
                    .map((d, i) => ({ index: i, value: d }))
                    .filter(d => d.value[0] >= minX && d.value[0] <= maxX)
                    .map(d => d.index);
                g.append("path")
                    .attr("class", "area")
                    .datum(filteredIndices.map(i => data[i]))
                    .attr("d", areaGenerator)
                    .attr("fill", "#82C4FF99");
                onBrush?.(filteredIndices.at(0) || 0, filteredIndices.at(-1) || 0);
            }

            const brush = d3.brushX()
                .extent([[0, 0], [innerWidth, innerHeight]])
                .on("brush", (event) => brushFn(event))
                .on("end", function (event) {
                    const selection = event.selection;
                    if (!selection) {
                        svg.select(".area").remove();
                        onBrush?.(0, 0);
                        return;
                    }
                    const [x0, x1] = selection;
                    const [minX, maxX] = [x.invert(x0 as number), x.invert(x1 as number)];
                    const filteredIndices = data
                        .map((d, i) => ({ index: i, value: d }))
                        .filter(d => d.value[0] >= minX && d.value[0] <= maxX)
                        .map(d => d.index);
                    onBrush?.(filteredIndices.at(0) || 0, filteredIndices.at(-1) || 0);
                });

            const brushG = svg.append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`)
                .attr("class", "brush")
                .call(brush);

            if (brushPosition) {
                brushG.call(brush.move!, [x(xData[brushPosition[0]] * 1000), x(xData[brushPosition[1]] * 1000)]);
            }

            svg.select(".selection")
                .attr("fill", "#3333")
                .attr("stroke", "none");

            return () => {
                brush.on("brush", null).on("end", null);
                svg.selectAll("*").remove();
            };
        }
    }, [xData, yData, title, isXAxisVisible, isYAxisVisible, isBrush, brushPosition, isSplitMask, split, isFill, range, onBrush, height, isZoom, ratio, xFormat])

    useEffect(() => {
        function handleResize() {
            if (svgRef.current) {
                draw();
            }
        }
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [draw])

    useEffect(() => {
        draw();
    }, [draw]);

    return (
        <svg ref={svgRef} width="100%" height={height ?? "100%"}></svg>
    );
};

export default memo(LineChart);