"use client";

import React from "react";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";
import MainView from "@/components/MainView";
import LyricsPanel from "@/components/LyricsPanel";
import BottomPlayer from "@/components/BottomPlayer";
import QueueDrawer from "@/components/QueueDrawer";

export default function Home() {
  return (
    <div className="relative z-10 flex flex-col w-screen h-screen overflow-hidden p-2 pb-0 gap-2">
      {/* Top Header */}
      <TopBar />

      {/* Workspace: Sidebar + Main + Lyrics */}
      <div className="flex flex-1 gap-2 overflow-hidden h-[calc(100vh-56px-80px-16px)]">
        <Sidebar />
        <MainView />
        <LyricsPanel />
      </div>

      {/* Persistent Bottom Player Bar */}
      <BottomPlayer />

      {/* Popover Queue Drawer */}
      <QueueDrawer />
    </div>
  );
}
