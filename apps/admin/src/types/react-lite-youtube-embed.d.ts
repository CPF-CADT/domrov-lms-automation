declare module "react-lite-youtube-embed" {
    import { ComponentType } from "react";

    export interface LiteYouTubeEmbedProps {
        id: string;
        title: string;
        adNetwork?: boolean;
        cookie?: boolean;
        noCookie?: boolean;
        params?: string;
        playlist?: boolean;
        playlistCoverId?: string;
        poster?: "default" | "mqdefault" | "hqdefault" | "sddefault" | "maxresdefault";
        webp?: boolean;
        wrapperClass?: string;
        playerClass?: string;
        activatedClass?: string;
        iframeClass?: string;
        aspectHeight?: number;
        aspectWidth?: number;
        onIframeAdded?: () => void;
        muted?: boolean;
        thumbnail?: string;
        rel?: string;
        announce?: string;
    }

    const LiteYouTubeEmbed: ComponentType<LiteYouTubeEmbedProps>;
    export default LiteYouTubeEmbed;
}
