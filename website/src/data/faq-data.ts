export interface FaqItem {
  id: string;
  category: 'general' | 'installation' | 'mods' | 'performance' | 'privacy';
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'is-free',
    category: 'general',
    question: 'Is Fern Client free to use?',
    answer: 'Yes. Fern Client is 100% free and open-source under the MIT license. There are no paywalled gameplay advantages, subscription fees, or pay-to-win mechanics.',
  },
  {
    id: 'windows-support',
    category: 'installation',
    question: 'Which Windows versions are supported?',
    answer: 'Fern Client supports 64-bit Windows 10 Version 1809 (Build 17763) or higher, and Windows 11. 32-bit (x86) Windows systems and older versions (Windows 7/8) are not supported due to modern Electron and Chromium runtime requirements.',
  },
  {
    id: 'minecraft-support',
    category: 'general',
    question: 'Which Minecraft versions work with Fern Client?',
    answer: 'Fern Client works with official Minecraft Java Edition releases from modern 1.21.4 LTS and 1.20.4 down to legacy 1.16.5, 1.12.2, and 1.8.9. Both Vanilla and modded installations are fully supported.',
  },
  {
    id: 'install-java',
    category: 'installation',
    question: 'How do I install Java, and does Fern Client manage it?',
    answer: 'Fern Client automatically scans your system for Java 21, 17, and 8 runtimes. Modern Minecraft (1.20.5+) requires Java 21 LTS (such as Eclipse Adoptium Temurin or Microsoft OpenJDK). You can also add custom Java runtimes manually in the Java Settings tab.',
  },
  {
    id: 'install-mods',
    category: 'mods',
    question: 'How do I install mods in Fern Client?',
    answer: 'You can install mods either by importing Modrinth modpack archives (.mrpack) directly through the Installations tab, or by opening an installation folder and dropping your .jar mods directly into the instance mods/ directory.',
  },
  {
    id: 'offline-behavior',
    category: 'privacy',
    question: 'What happens if Fern Client servers or my internet connection are unavailable?',
    answer: 'Fern Client is strictly offline-first. If internet access or the Fern backend is unreachable, the launcher displays an Offline status badge and continues functioning completely: you can launch local Minecraft installations, use all HUD layouts, customize themes, and switch profiles without interruption.',
  },
  {
    id: 'performance-impact',
    category: 'performance',
    question: 'Does Fern Client guarantee an increase in FPS?',
    answer: 'No launcher can truthfully guarantee universal FPS gains for every system. Fern Client maximizes runtime efficiency by synthesizing optimized G1GC JVM memory boundaries, minimizing background process overhead, and rendering in-game HUD widgets with zero garbage collection allocations. Actual framerates depend on your GPU, CPU, render distance, and selected optimization mods.',
  },
  {
    id: 'how-to-update',
    category: 'installation',
    question: 'How do I update Fern Client?',
    answer: 'Fern Client automatically checks for updates on your selected release channel (Stable or Beta). When an update is available, you can review release notes, verify the Ed25519 digital signature, and download the update package. You can also defer updates if you prefer to stay on your current version.',
  },
  {
    id: 'log-storage',
    category: 'privacy',
    question: 'Where are application logs and user data stored?',
    answer: 'User configuration, Minecraft instances, logs, and screenshots are stored in %AppData%\\Fern Client. Application binaries reside separately in %LocalAppData%\\Programs\\Fern Client. You can also override the data directory by setting the FERN_HOME environment variable.',
  },
  {
    id: 'recover-failed-update',
    category: 'installation',
    question: 'How do I recover if an update fails or crashes?',
    answer: 'Before applying any update, Fern Client takes an automatic snapshot of existing executables. If a new version fails to boot, you can open the About tab and click "Restore Previous Version" to restore your previous installation state immediately.',
  },
  {
    id: 'uninstall-behavior',
    category: 'installation',
    question: 'How do I uninstall Fern Client, and will my Minecraft worlds be deleted?',
    answer: 'You can uninstall Fern Client through Windows Add/Remove Programs (Settings > Apps > Installed apps) or by running Uninstall.exe in %LocalAppData%\\Programs\\Fern Client. During uninstallation, you are asked whether you want to delete launcher configuration. Your Minecraft singleplayer world saves are never deleted unless you explicitly choose to remove them.',
  },
  {
    id: 'report-bug',
    category: 'general',
    question: 'How do I report a bug or suggest an improvement?',
    answer: 'You can report bugs directly through the launcher by opening the About tab and clicking "Feedback & Bug Reporting", or by using the Support Portal on this website. Reports include optional sanitized diagnostic data that scrubs all authentication tokens and usernames before submission.',
  },
];
