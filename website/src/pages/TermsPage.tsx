import React from 'react';
import { Scale, AlertCircle, FileCode, ShieldAlert, Award } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="py-12 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-4">
          <Scale size={14} /> Legal Terms & Licensing
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Terms of Use & Legal Notices
        </h1>
        <p className="text-gray-400 mt-3 text-sm leading-relaxed">
          Last revised: October 10, 2026. Please review the terms governing the use of Fern Client software, online services, and documentation.
        </p>
      </div>

      <div className="bg-[#111620] border border-gray-800/80 rounded-2xl p-6 sm:p-10 space-y-8 text-sm text-gray-300 leading-relaxed">
        {/* Minecraft Disclaimer Banner */}
        <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-xl flex items-start gap-3 text-amber-200">
          <AlertCircle size={20} className="shrink-0 mt-0.5 text-amber-400" />
          <div className="text-xs sm:text-sm">
            <strong className="text-white block mb-1">NOT AN OFFICIAL MINECRAFT PRODUCT</strong>
            Fern Client is an independent third-party launcher and client utility. Fern Client is not approved by, associated with, or affiliated with Mojang Studios, Microsoft Corporation, or any of their subsidiaries. Minecraft is a registered trademark of Mojang Synergies AB.
          </div>
        </div>

        {/* Section 1: Open Source & License */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <FileCode size={18} className="text-emerald-400" /> 1. Open Source License (MIT)
          </h2>
          <p>
            The Fern Client launcher and native application source code are licensed under the terms of the <strong>MIT License</strong>.
          </p>
          <div className="mt-3 p-4 bg-gray-900 border border-gray-800 rounded-xl font-mono text-xs text-gray-400 leading-relaxed">
            Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software...
          </div>
        </section>

        {/* Section 2: Account Ownership & Minecraft EULA */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <Award size={18} className="text-emerald-400" /> 2. Game Ownership & Mojang EULA Compliance
          </h2>
          <p>
            Fern Client does not distribute, host, or pirate Minecraft binaries, game code, or proprietary Mojang assets. To download and play Minecraft Java Edition through Fern Client, you must own a legitimate Minecraft Java Edition license associated with an authentic Microsoft account.
          </p>
          <p className="mt-2">
            Users must comply with Mojang's official End User License Agreement (EULA) and Microsoft's Terms of Services at all times.
          </p>
        </section>

        {/* Section 3: Acceptable Use Policy */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <ShieldAlert size={18} className="text-emerald-400" /> 3. Acceptable Use Policy
          </h2>
          <p>
            By utilizing Fern Client or its online synchronization services, you agree not to:
          </p>
          <ul className="space-y-1.5 list-disc pl-5 mt-2 text-gray-300">
            <li>Employ Fern Client to bypass multiplayer server anti-cheat systems, exploit vulnerabilities, or distribute malicious modifications.</li>
            <li>Distribute unauthorized Minecraft credentials, tokens, or cracked account authenticators.</li>
            <li>Abuse, disrupt, or execute denial-of-service attacks against Fern backend infrastructure.</li>
            <li>Harass, impersonate, or infringe upon the rights of other users through friend requests or cosmetic display handles.</li>
          </ul>
        </section>

        {/* Section 4: Limitation of Liability */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <Scale size={18} className="text-emerald-400" /> 4. Disclaimer of Warranties & Limitation of Liability
          </h2>
          <p>
            THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT.
          </p>
          <p className="mt-2">
            IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY ARISING FROM THE USE OF THE SOFTWARE OR USER-INSTALLED MODIFICATIONS, INCLUDING DATA LOSS, CORRUPTION OF MINECRAFT WORLDS, OR MULTIPLAYER SERVER BANS.
          </p>
        </section>

        {/* Section 5: Third-Party Notices */}
        <section className="pt-4 border-t border-gray-800">
          <h3 className="font-bold text-white mb-2">Third-Party Software Notices</h3>
          <p className="text-xs text-gray-400">
            Fern Client incorporates open-source components including Tauri, Rust, React, Lucide Icons, and various Minecraft community mod loader APIs (FabricMC, NeoForged, LexForge). Respective licenses and copyrights remain with their original authors.
          </p>
        </section>
      </div>
    </div>
  );
};
