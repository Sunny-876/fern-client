import React from 'react';
import { Shield, Eye, Lock, Server, Trash2, CheckCircle2 } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="py-12 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-4">
          <Shield size={14} /> Transparency & Data Practices
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-gray-400 mt-3 text-sm leading-relaxed">
          Last revised: October 10, 2026. This policy describes how Fern Client and its optional backend handle your data with an offline-first, privacy-by-design architecture.
        </p>
      </div>

      <div className="bg-[#111620] border border-gray-800/80 rounded-2xl p-6 sm:p-10 space-y-8 text-sm text-gray-300 leading-relaxed">
        {/* Core Philosophy */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <Lock size={18} className="text-emerald-400" /> 1. Offline-First Architecture
          </h2>
          <p>
            Fern Client is engineered from the ground up as an offline-first desktop launcher. You do not need to register a Fern account, connect to the internet, or enable cloud services to launch Minecraft, install mods, customize HUD elements, or configure keybinds.
          </p>
          <p className="mt-2">
            All Minecraft instances, world saves, mod configurations, and local profiles remain entirely on your local machine under your Windows user directory (<code className="px-1.5 py-0.5 bg-gray-900 text-emerald-300 rounded font-mono text-xs">%AppData%\.fern</code> or the portable <code className="px-1.5 py-0.5 bg-gray-900 text-emerald-300 rounded font-mono text-xs">./data</code> directory).
          </p>
        </section>

        {/* Data We Process */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <Eye size={18} className="text-emerald-400" /> 2. Data Collected When Using Optional Online Features
          </h2>
          <p>
            If you optionally choose to register for a Fern Client account or enable Cloud Synchronization, the following data is processed by the Fern backend:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-xl">
              <h3 className="font-semibold text-white mb-1.5 text-xs uppercase tracking-wider text-emerald-400">Account Credentials</h3>
              <p className="text-xs text-gray-400">
                Email address, display name, and password hashed using Argon2id with unique cryptographic salts. We never store raw passwords.
              </p>
            </div>
            <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-xl">
              <h3 className="font-semibold text-white mb-1.5 text-xs uppercase tracking-wider text-emerald-400">Cloud Sync Payloads</h3>
              <p className="text-xs text-gray-400">
                User HUD layout configurations, custom keybinds, and client settings profiles serialized as encrypted or scoped JSON documents.
              </p>
            </div>
            <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-xl">
              <h3 className="font-semibold text-white mb-1.5 text-xs uppercase tracking-wider text-emerald-400">Social & Presence Data</h3>
              <p className="text-xs text-gray-400">
                Online status (Online/Away/Offline), current Minecraft version, and mutual friend requests. Rich presence broadcasting can be disabled at any time in Launcher Settings.
              </p>
            </div>
            <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-xl">
              <h3 className="font-semibold text-white mb-1.5 text-xs uppercase tracking-wider text-emerald-400">Audit & Security Logs</h3>
              <p className="text-xs text-gray-400">
                IP address, user agent, and timestamp for login attempts, password resets, and session revocations, retained solely for brute-force prevention.
              </p>
            </div>
          </div>
        </section>

        {/* What We Never Collect */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-400" /> 3. Data We Never Collect
          </h2>
          <ul className="space-y-2 list-disc pl-5 text-gray-300">
            <li>
              <strong>Microsoft / Mojang Credentials:</strong> Microsoft OAuth 2.0 authentication is performed directly against official Microsoft authentication endpoints (<code className="font-mono text-xs text-emerald-300">login.live.com</code>). Fern Client never receives or stores your Microsoft account password.
            </li>
            <li>
              <strong>Unsanitized Crash Dumps:</strong> Diagnostic logs generated in the launcher undergo local automated redaction to strip authentication tokens, passwords, and sensitive Windows paths before any export.
            </li>
            <li>
              <strong>Advertising or Third-Party Behavioral Tracking:</strong> Neither the desktop client nor the official website contains advertising trackers, cross-site cookies, or behavioral advertising SDKs.
            </li>
          </ul>
        </section>

        {/* Third-Party Service Providers */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <Server size={18} className="text-emerald-400" /> 4. Third-Party Service Providers
          </h2>
          <p>
            Fern Client connects with standard Minecraft ecosystem infrastructure to facilitate game downloads and modding:
          </p>
          <ul className="space-y-2 list-disc pl-5 mt-2 text-gray-300">
            <li><strong>Microsoft & Xbox Live:</strong> Official Minecraft Java Edition ownership verification and session token issuance.</li>
            <li><strong>Mojang / Amazon Web Services:</strong> Official Minecraft game assets, client jars, and library downloads.</li>
            <li><strong>FabricMC / NeoForged / Minecraft Forge:</strong> Mod loader metadata and runtime installation libraries.</li>
            <li><strong>Modrinth:</strong> Mod and resource pack metadata when explicitly requested by user searches or modpack imports.</li>
          </ul>
        </section>

        {/* Data Retention & Deletion */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <Trash2 size={18} className="text-emerald-400" /> 5. Data Deletion and Export
          </h2>
          <p>
            You have full control over your stored data:
          </p>
          <ul className="space-y-2 list-disc pl-5 mt-2 text-gray-300">
            <li>
              <strong>Local Data:</strong> Delete your <code className="font-mono text-xs text-emerald-300">%AppData%\.fern</code> folder or portable directory at any time to remove all local profiles and caches.
            </li>
            <li>
              <strong>Cloud Account & Sync Data:</strong> You may request full account deletion and cloud backup purging via the Launcher Account Settings or by contacting the project administrators. Upon confirmation, your synchronized profiles and credentials are permanently destroyed.
            </li>
          </ul>
        </section>

        {/* Contact Information Placeholder */}
        <section className="pt-4 border-t border-gray-800">
          <h3 className="font-bold text-white mb-2">Legal & Contact Inquiries</h3>
          <p className="text-xs text-gray-400">
            For privacy inquiries, data deletion requests, or security notices, reach out via our GitHub repository or contact the project maintainers at <code className="font-mono text-emerald-300">privacy@fernclient.local</code> (pre-launch administrative mailbox).
          </p>
        </section>
      </div>
    </div>
  );
};
