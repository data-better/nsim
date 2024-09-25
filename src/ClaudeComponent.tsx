import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { PlayCircle, PauseCircle } from 'lucide-react';

const DistributionSimulation = () => {
  const [distribution, setDistribution] = useState("N(0,1)");
  const [n, setN] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [results, setResults] = useState(null);

  const simulationCount = 10000;

  const parseDistribution = useCallback(() => {
    const match = distribution.match(/N\(([-\d.]+),([-\d.]+)\)/);
    if (match) {
      return { mu: parseFloat(match[1]), sigma2: parseFloat(match[2]) };
    }
    return { mu: 0, sigma2: 1 };
  }, [distribution]);

  const generateNormalSample = useCallback(() => {
    const { mu, sigma2 } = parseDistribution();
    let sum = 0;
    let sumSquared = 0;
    for (let i = 0; i < n; i++) {
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const x = mu + Math.sqrt(sigma2) * z;
      sum += x;
      sumSquared += x * x;
    }
    const xBar = sum / n;
    const s2 = (sumSquared - n * xBar * xBar) / (n - 1);
    return { xBar, s2 };
  }, [n, parseDistribution]);

  const runSimulation = useCallback(() => {
    const { mu, sigma2 } = parseDistribution();
    const tStats = [];
    const chiSquareStats = [];
    for (let i = 0; i < simulationCount; i++) {
      const { xBar, s2 } = generateNormalSample();
      const tStat = (xBar - mu) / (Math.sqrt(s2 / n));
      const chiSquareStat = ((n - 1) * s2) / sigma2;
      tStats.push(tStat);
      chiSquareStats.push(chiSquareStat);
    }
    const tHistogram = createHistogram(tStats, 20);
    const chiSquareHistogram = createHistogram(chiSquareStats, 20);
    setResults({ tHistogram, chiSquareHistogram });
  }, [n, generateNormalSample, parseDistribution]);

  const createHistogram = (data, bins) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const binWidth = (max - min) / bins;
    const histogram = Array(bins).fill(0);
    data.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1);
      histogram[binIndex]++;
    });
    return histogram.map((count, index) => ({
      x: Number((min + (index + 0.5) * binWidth).toFixed(3)),
      count: count / (data.length * binWidth)
    }));
  };

  const gamma = useMemo(() => {
    const g = 7;
    const p = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    return (z) => {
      if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
      z -= 1;
      let x = p[0];
      for (let i = 1; i < g + 2; i++) x += p[i] / (z + i);
      const t = z + g + 0.5;
      return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
    };
  }, []);

  const theoreticalChiSquare = useCallback((x) => {
    const k = n - 1;
    return (Math.pow(x, k / 2 - 1) * Math.exp(-x / 2)) / (Math.pow(2, k / 2) * gamma(k / 2));
  }, [n, gamma]);

  const theoreticalT = useCallback((x) => {
    const v = n - 1;
    return (gamma((v + 1) / 2) / (Math.sqrt(v * Math.PI) * gamma(v / 2))) * Math.pow(1 + x * x / v, -(v + 1) / 2);
  }, [n, gamma]);

  const standardNormal = useCallback((x) => {
    return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-(x * x) / 2);
  }, []);

  useEffect(() => {
    let intervalId;
    if (isPlaying) {
      intervalId = setInterval(() => {
        setN(prevN => {
          const newN = prevN + 1;
          if (newN > 50) {
            setIsPlaying(false);
            return 50;
          }
          return newN;
        });
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [isPlaying]);

  useEffect(() => {
    runSimulation();
  }, [n, distribution, runSimulation]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-300 rounded shadow">
          <p>{`x: ${Number(label).toFixed(3)}`}</p>
          {payload.map((pld, index) => (
            <p key={index} style={{ color: pld.color }}>
              {`${pld.name}: ${pld.value.toFixed(3)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 max-w-6xl mx-auto bg-blue-100">
      <h1 className="text-2xl font-bold mb-4 text-center bg-blue-600 text-white p-2">표본평균과 표본분산의 분포 시뮬레이션</h1>
      
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-sm whitespace-nowrap">확률표본:</span>
        <Input 
          type="text" 
          value={distribution} 
          onChange={(e) => setDistribution(e.target.value)}
          className="w-16 text-center text-sm p-1" 
          placeholder="N(0,1)"
        />
        <Label htmlFor="n" className="italic font-medium text-sm">n</Label>
        <Slider
          id="n"
          min={3}
          max={50}
          step={1}
          value={[n]}
          onValueChange={(value) => setN(value[0])}
          className="w-32"
        />
        <span className="italic font-medium text-sm">{n}</span>
        <Button onClick={togglePlay} variant="outline" size="sm" className="p-1">
          {isPlaying ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
        </Button>
      </div>
      
      {results && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">표본평균의 분포 : t({n-1})</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={results.tHistogram}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" tickFormatter={(value) => value.toFixed(3)} tick={{fontSize: 10}} />
                  <YAxis tick={{fontSize: 10}} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#82ca9d" name="표본평균" />
                  <Line type="monotone" dataKey={(data) => theoreticalT(data.x)} stroke="#ff7300" name="t분포" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey={(data) => standardNormal(data.x)} stroke="#0000ff" name="N(0,1)" dot={false} strokeWidth={1.5} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem', paddingLeft: '24px' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-center">표본분산의 분포 : χ²({n-1})</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={results.chiSquareHistogram}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" tickFormatter={(value) => value.toFixed(3)} tick={{fontSize: 10}} />
                  <YAxis tick={{fontSize: 10}} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#8884d8" name="표본분산" />
                  <Line type="monotone" dataKey={(data) => theoreticalChiSquare(data.x)} stroke="#ff7300" name="χ² 분포" dot={false} strokeWidth={1.5} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem', paddingLeft: '24px' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DistributionSimulation;