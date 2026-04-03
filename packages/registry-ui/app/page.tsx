"use client";

import { useState, useEffect } from "react";

interface Tool {
  name: string;
  endpoint: string;
  price: string;
  description: string;
  totalCalls: number;
  totalEarned: number;
}

export default function MCPayRegistry() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [totalVolume, setTotalVolume] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsRes = await fetch("http://localhost:3001/stats");
        const stats: any[] = await statsRes.json();

        const manifestRes = await fetch("http://localhost:3001/.well-known/mcp");
        const { tools: toolList } = await manifestRes.json();

        const mergedTools = toolList.map((t: any) => {
          const stat = stats.find((s: any) => s.toolName === t.name);
          return {
            ...t,
            totalCalls: stat?.totalCalls || 0,
            totalEarned: stat?.totalEarned || 0,
          };
        });

        setTools(mergedTools);
        setTotalVolume(
          mergedTools.reduce((sum: number, t: Tool) => sum + t.totalEarned, 0)
        );
      } catch (err) {
        console.error("Failed to fetch stats", err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        background: "#0a0a0a",
        minHeight: "100vh",
        color: "white",
        fontFamily: "monospace",
        padding: "24px",
      }}
    >
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", color: "#00ff88", margin: 0 }}>
          ⚡ MCPay Registry
        </h1>
        <p style={{ color: "#666", margin: "8px 0 0" }}>
          The monetization layer for MCP tools. Pay per call, earn per call.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        <StatCard
          label="Total Volume"
          value={`$${totalVolume.toFixed(4)}`}
          color="#00ff88"
        />
        <StatCard
          label="Tools"
          value={tools.length.toString()}
          color="#0088ff"
        />
        <StatCard
          label="Total Calls"
          value={tools.reduce((s, t) => s + t.totalCalls, 0).toString()}
          color="#ff8800"
        />
      </div>

      <h2 style={{ color: "#888", marginBottom: "16px" }}>Available Tools</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "16px",
        }}
      >
        {tools.map((tool) => (
          <ToolCard key={tool.name} tool={tool} />
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: any) {
  return (
    <div
      style={{
        background: "#111",
        border: `1px solid ${color}33`,
        borderRadius: "12px",
        padding: "20px",
      }}
    >
      <div style={{ color: "#666", fontSize: "12px" }}>{label}</div>
      <div style={{ color, fontSize: "28px", fontWeight: "bold" }}>{value}</div>
    </div>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #222",
        borderRadius: "12px",
        padding: "20px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#00ff88", fontWeight: "bold" }}>
          {tool.name}
        </span>
        <span style={{ color: "#666" }}>{tool.price}/call</span>
      </div>
      <p style={{ color: "#888", fontSize: "14px", margin: "12px 0" }}>
        {tool.description}
      </p>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "16px",
        }}
      >
        <div>
          <div style={{ color: "#444", fontSize: "10px" }}>CALLS</div>
          <div>{tool.totalCalls}</div>
        </div>
        <div>
          <div style={{ color: "#444", fontSize: "10px" }}>EARNED</div>
          <div style={{ color: "#00ff88" }}>${tool.totalEarned.toFixed(4)}</div>
        </div>
      </div>
    </div>
  );
}
