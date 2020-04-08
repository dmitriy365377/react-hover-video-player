import React from 'react';

import FadeTransition from './FadeTransition';
import styles from '../styles/HoverVideoPlayer.css';

// Enumerates states that the hover player can be in
const HOVER_PLAYER_STATE = {
  stopped: 0,
  stopping: 1,
  loading: 2,
  playing: 3,
};

/**
 * @typedef   {object}  VideoSource
 * @property  {string}  src - The src URL string to use for a video player source
 * @property  {string}  type - The media type of the video, ie 'video/mp4'
 */

/**
 * @typedef   {object}  VideoCaptionsTrack
 * @property  {string}  src - The src URL string for the captions track file
 * @property  {string}  srcLang - The language code for the language that these captions are in
 * @property  {string}  label - The title of the captions track
 */

/**
 * @component HoverVideoPlayer
 *
 * @param {!(string|string[]|VideoSource|VideoSource[])}  videoSrc - Source(s) to use for the video player. Accepts 3 different formats:
 *                                                                   - **String**: the URL string to use as the video player's src
 *                                                                   - **Object**: an object with attributes:
 *                                                                     - src: The src URL string to use for a video player source
 *                                                                     - type: The media type of the video source, ie 'video/mp4'
 *                                                                   - **Array**: if you would like to provide multiple sources, you can provide an array of URL strings and/or objects with the shape described above
 * @param {!(string|string[]|VideoCaptionsTrack|VideoCaptionsTrack[])} videoCaptions - Captions track(s) to use for the video player for accessibility. Accepts 3 different formats:
 *                                                                                     - **String**: the URL string to use as the captions track's src
 *                                                                                     - **Object**: an object with attributes:
 *                                                                                       - src: The src URL string for the captions track file
 *                                                                                       - srcLang: The language code for the language that these captions are in (ie, 'en', 'es', 'fr')
 *                                                                                       - label: The title of the captions track
 *                                                                                     - **Array**: if you would like to provide multiple caption tracks, you can provide an array of objects with the shape described above
 * @param {bool}    [isFocused=false] - Offers a prop interface for forcing the video to start/stop without DOM events
 *                                        When set to true, the video will begin playing and any events that would normally
 *                                        stop it will be ignored
 * @param {node}    [pausedOverlay] - Contents to render over the video while it's not playing
 * @param {node}    [loadingStateOverlay] - Contents to render over the video while it's loading
 * @param {number}  [overlayFadeTransitionDuration=400] - The transition duration in ms for how long it should take for the overlay to fade in/out
 * @param {bool}    [shouldRestartOnVideoStopped=true] - Whether the video should reset to the beginning every time it stops playing after the user mouses out of the player
 * @param {func}    [onStartingVideo] - Optional callback for every time the user mouses over or focuses on the hover player and we attempt to start the video
 * @param {func}    [onStartedVideo] - Optional callback for when the video has been successfully started
 * @param {func}    [onStoppingVideo] - Optional callback for every time the user mouses out or blurs the hover player and we attempt to stop the video
 * @param {func}    [onStoppedVideo] - Optional callback for when the video has successfully been stopped
 * @param {bool}    [isVideoMuted=true] - Whether the video player should be muted
 * @param {bool}    [shouldShowVideoControls=false] - Whether the video player should show the browser's controls
 * @param {bool}    [shouldVideoLoop=true] - Whether the video player should loop when it reaches the end
 * @param {string}  [videoPreload='metadata'] - What the video should preload. Possible values:
 *                                              - 'none': No part of the video will be preloaded before we try to play it
 *                                              - 'metadata' (default): Only the video's metadata will be preloaded, including information such as its length
 *                                              - 'auto': The entire video will be preloaded even if it may not be played
 * @param {string}  [className] - Optional className to apply custom styling to the container element
 * @param {string}  [overlayWrapperClassName] - Optional className to apply custom styling to the overlay contents' wrapper
 * @param {string}  [loadingStateOverlayWrapperClassName] - Optional className to apply custom styling to the loading state overlay contents' wrapper
 * @param {string}  [videoClassName] - Optional className to apply custom styling to the video element
 * @param {object}  [style] - Style object to apply custom CSS styles to the hover player container
 */
function HoverVideoPlayer({
  videoSrc,
  videoCaptions,
  isFocused = false,
  pausedOverlay = null,
  loadingStateOverlay = null,
  overlayFadeTransitionDuration = 400,
  shouldRestartOnVideoStopped = true,
  onStartingVideo = null,
  onStartedVideo = null,
  onStoppingVideo = null,
  onStoppedVideo = null,
  isVideoMuted = true,
  shouldShowVideoControls = false,
  shouldVideoLoop = true,
  videoPreload = 'metadata',
  className = '',
  overlayWrapperClassName = '',
  loadingStateOverlayWrapperClassName = '',
  videoClassName = '',
  style = null,
}) {
  const [hoverPlayerState, setHoverPlayerState] = React.useState(
    HOVER_PLAYER_STATE.stopped
  );

  const containerRef = React.useRef();
  const videoRef = React.useRef();
  const pauseVideoTimeoutRef = React.useRef();

  // Parse the `videoSrc` prop into an array of VideoSource objects to be used for the video player
  const parsedVideoSources = React.useMemo(() => {
    if (videoSrc == null) {
      // A videoSrc value is required in order to make the video player work
      console.error(
        "Error: 'videoSrc' prop is required for HoverVideoPlayer component"
      );

      return [];
    }

    return (
      // Make sure we can treat the videoSrc value as an array
      []
        .concat(videoSrc)
        // Parse our video source values into an array of VideoSource objects that can be used to render sources for the video
        .reduce((sourceArray, source) => {
          if (typeof source === 'string') {
            // If the source is a string, it's an src URL so format it into a VideoSource object and add it to the array
            sourceArray.push({ src: source });
          } else if (source && source.src) {
            // If the source is an object with an src, just add it to the array
            sourceArray.push({ src: source.src, type: source.type });
          } else {
            // Log an error if one of the videoSrc values is invalid
            console.error(
              "Error: invalid value provided to HoverVideoPlayer prop 'videoSrc':",
              source
            );
          }

          return sourceArray;
        }, [])
    );
  }, [videoSrc]);

  const parsedVideoCaptions = React.useMemo(() => {
    // If no captions were provided, return an empty array
    if (videoCaptions == null) return [];

    return (
      // Make sure we can treat the videoSrc value as an array
      []
        .concat(videoCaptions)
        // Parse our video captions values into an array of VideoCaptionsTrack
        // objects that can be used to render caption tracks for the video
        .reduce((captionsArray, captions) => {
          if (typeof captions === 'string') {
            captionsArray.push({ src: captions });
          } else if (captions && captions.src) {
            captionsArray.push({
              src: captions.src,
              srcLang: captions.srcLang,
              label: captions.label,
            });
          } else {
            // Log an error if one of the videoCaptions values is invalid
            console.error(
              "Error: invalid value provided to HoverVideoPlayer prop 'videoCaptions'",
              captions
            );
          }

          return captionsArray;
        }, [])
    );
  }, [videoCaptions]);

  /**
   * @function  attemptStartVideo
   *
   * Starts the video and fades the paused overlay out when the user mouses over or focuses in the video container element
   */
  function attemptStartVideo() {
    // If we have an onStartingVideo callback, fire it to indicate the video is attempting to start
    if (onStartingVideo) onStartingVideo();

    // If the user quickly moved their mouse away and then back over the container,
    // cancel any outstanding timeout that would pause the video
    clearTimeout(pauseVideoTimeoutRef.current);

    // If the video is already loading/playing, return early
    if (hoverPlayerState >= HOVER_PLAYER_STATE.loading) return;

    // Mark that we are attempting to play the video and should show a loading state
    setHoverPlayerState(HOVER_PLAYER_STATE.loading);

    if (videoRef.current.paused) {
      // If the video is not playing and has no play attempt in progress, start a play attempt
      videoRef.current.play();
    }
  }

  /**
   * @function  attemptStopVideo
   *
   * Stops the video and fades the paused overlay in when the user mouses out from or blurs the video container element
   */
  const attemptStopVideo = React.useCallback(() => {
    // If the isFocused override prop is active, ignore any other events attempting to stop the video
    if (isFocused) return;

    // If we have an onStoppingVideo callback, fire it to indicate the video is in the process of being stopped
    if (onStoppingVideo) onStoppingVideo();

    // If we already had a timeout going to pause the video, cancel it so we can
    // replace it with a new one
    clearTimeout(pauseVideoTimeoutRef.current);

    // Return early if the video is already stopped
    if (hoverPlayerState <= HOVER_PLAYER_STATE.stopping) return;

    // Start fading the overlay back in to cover up the video before it's paused
    setHoverPlayerState(HOVER_PLAYER_STATE.stopping);

    // Set a timeout with the duration of the overlay's fade transition so the video
    // won't stop until it's fully hidden
    pauseVideoTimeoutRef.current = setTimeout(
      () => {
        if (hoverPlayerState === HOVER_PLAYER_STATE.playing) {
          // If the video is playing, pause it
          videoRef.current.pause();
        }
      },
      pausedOverlay ? overlayFadeTransitionDuration : 0
    );
  }, [
    hoverPlayerState,
    isFocused,
    onStoppingVideo,
    overlayFadeTransitionDuration,
    pausedOverlay,
  ]);

  React.useEffect(() => {
    // Manually setting the `muted` attribute on the video element via an effect in order
    // to avoid a know React issue with the `muted` prop not applying correctly on initial render
    // https://github.com/facebook/react/issues/10389
    const { current: videoElement } = videoRef;

    videoElement.muted = isVideoMuted;
  }, [isVideoMuted]);

  React.useEffect(() => {
    // Use effect to start/stop the video when isFocused override prop changes
    if (isFocused) {
      attemptStartVideo();
    } else {
      attemptStopVideo();
    }

    // We really only want to fire this effect when the isFocused prop changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  React.useEffect(() => {
    const onWindowTouchStart = (event) => {
      if (!containerRef.current.contains(event.target)) {
        attemptStopVideo();
      }
    };

    window.addEventListener('touchstart', onWindowTouchStart);

    // Remove the event listener on cleanup
    return () => window.removeEventListener('touchstart', onWindowTouchStart);
  }, [attemptStopVideo]);

  return (
    <div
      onMouseEnter={attemptStartVideo}
      onFocus={attemptStartVideo}
      onMouseOut={attemptStopVideo}
      onBlur={attemptStopVideo}
      onTouchStart={attemptStartVideo}
      className={`${styles.Container} ${className}`}
      style={style}
      data-testid="hover-video-player-container"
      ref={containerRef}
    >
      {pausedOverlay && (
        <FadeTransition
          isVisible={hoverPlayerState <= HOVER_PLAYER_STATE.loading}
          duration={overlayFadeTransitionDuration}
          className={`${styles.PausedOverlayContainer} ${overlayWrapperClassName}`}
        >
          {pausedOverlay}
        </FadeTransition>
      )}
      {loadingStateOverlay && (
        <FadeTransition
          isVisible={hoverPlayerState === HOVER_PLAYER_STATE.loading}
          duration={overlayFadeTransitionDuration}
          shouldMountOnEnter
          className={`${styles.PausedOverlayContainer} ${loadingStateOverlayWrapperClassName}`}
        >
          {loadingStateOverlay}
        </FadeTransition>
      )}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        controls={shouldShowVideoControls}
        loop={shouldVideoLoop}
        playsInline
        preload={videoPreload}
        ref={videoRef}
        className={`${styles.Video} ${videoClassName}`}
        onPlaying={() => {
          if (hoverPlayerState >= HOVER_PLAYER_STATE.loading) {
            // If the player was showing a loading state, transition into the playing state
            setHoverPlayerState(HOVER_PLAYER_STATE.playing);

            // If we have an onStartedVideo callback, fire it to indicate the video has successfully started
            if (onStartedVideo) onStartedVideo();
          } else {
            // If our play attempt completed but the user has since moused away and is not looking
            // at the loading state, immediately pause the video until the user comes back
            videoRef.current.pause();
          }
        }}
        onPause={() => {
          if (shouldRestartOnVideoStopped) {
            // If we should restart the video, reset its time to the beginning
            videoRef.current.currentTime = 0;
          }

          // Mark that the video has been stopped
          setHoverPlayerState(HOVER_PLAYER_STATE.stopped);

          // If we have an onStoppedVideo callback, fire it to indicate the video has been stopped
          if (onStoppedVideo) onStoppedVideo();
        }}
        onError={() => {
          setHoverPlayerState(HOVER_PLAYER_STATE.stopped);
        }}
      >
        {parsedVideoSources.map(({ src, type }) => (
          <source key={src} src={src} type={type} />
        ))}
        {parsedVideoCaptions.map(({ src, srcLang, label }) => (
          <track
            key={src}
            kind="captions"
            src={src}
            srcLang={srcLang}
            label={label}
          />
        ))}
      </video>
    </div>
  );
}

export default HoverVideoPlayer;