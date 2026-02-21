import { Capacitor } from '@capacitor/core';
import {
    AdMob,
    BannerAdSize,
    BannerAdPosition,
    RewardAdPluginEvents,
} from '@capacitor-community/admob';

// Production ad unit IDs
const PROD_IDS = {
    banner: 'ca-app-pub-3620840002382918/3698512630',
    interstitial: 'ca-app-pub-3620840002382918/6201745831',
    rewarded: 'ca-app-pub-3620840002382918/3723067949',
};

// Google official test ad unit IDs (for development)
const TEST_IDS = {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
};

// Switch to PROD_IDS and set isTesting: false for production release
const IS_TESTING = false;
const AD_IDS = IS_TESTING ? TEST_IDS : PROD_IDS;

class AdMobService {
    private initialized = false;
    private isNative = false;

    // Interstitial frequency control
    private gameOverCount = 0;
    private readonly interstitialFrequency = 3; // Show every N game overs

    // Rewarded ad state
    private rewardedLoaded = false;
    private rewardEarned = false;

    async initialize(): Promise<void> {
        this.isNative = Capacitor.isNativePlatform();
        if (!this.isNative || this.initialized) return;

        try {
            await AdMob.initialize({
                initializeForTesting: IS_TESTING,
            });

            // Listen for rewarded ad events
            AdMob.addListener(RewardAdPluginEvents.Loaded, () => {
                this.rewardedLoaded = true;
            });

            AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
                this.rewardedLoaded = false;
            });

            AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
                this.rewardEarned = true;
            });

            AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
                this.rewardedLoaded = false;
            });

            // Preload rewarded ad
            this.prepareRewarded();

            this.initialized = true;
        } catch (e) {
            console.warn('AdMob initialization failed:', e);
        }
    }

    async showBanner(): Promise<void> {
        if (!this.isNative) return;

        try {
            await AdMob.showBanner({
                adId: AD_IDS.banner,
                adSize: BannerAdSize.ADAPTIVE_BANNER,
                position: BannerAdPosition.BOTTOM_CENTER,
                isTesting: IS_TESTING,
            });
        } catch (e) {
            console.warn('Banner show failed:', e);
        }
    }

    async hideBanner(): Promise<void> {
        if (!this.isNative) return;

        try {
            await AdMob.hideBanner();
        } catch (e) {
            // Ignore - banner may not be showing
        }
    }

    async showInterstitialIfReady(): Promise<void> {
        if (!this.isNative) return;

        this.gameOverCount++;
        if (this.gameOverCount % this.interstitialFrequency !== 0) return;

        try {
            await AdMob.prepareInterstitial({
                adId: AD_IDS.interstitial,
                isTesting: IS_TESTING,
            });
            await AdMob.showInterstitial();
        } catch (e) {
            console.warn('Interstitial failed:', e);
        }
    }

    async showRewarded(): Promise<boolean> {
        if (!this.isNative) return true; // Always grant reward in dev/web

        this.rewardEarned = false;

        try {
            if (!this.rewardedLoaded) {
                await this.prepareRewarded();
            }
            await AdMob.showRewardVideoAd();

            // Wait a moment for the reward callback
            await new Promise(resolve => setTimeout(resolve, 500));

            // Preload next rewarded ad
            this.prepareRewarded();

            return this.rewardEarned;
        } catch (e) {
            console.warn('Rewarded ad failed:', e);
            return false;
        }
    }

    isRewardedReady(): boolean {
        if (!this.isNative) return true; // Always ready in dev/web
        return this.rewardedLoaded;
    }

    private async prepareRewarded(): Promise<void> {
        try {
            await AdMob.prepareRewardVideoAd({
                adId: AD_IDS.rewarded,
                isTesting: IS_TESTING,
            });
        } catch (e) {
            console.warn('Rewarded ad prepare failed:', e);
        }
    }

    resetGameOverCount(): void {
        this.gameOverCount = 0;
    }
}

export const adMobService = new AdMobService();
