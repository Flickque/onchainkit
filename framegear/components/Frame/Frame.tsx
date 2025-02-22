import { postFrame } from '@/utils/postFrame';
import { frameResultsAtom } from '@/utils/store';
import { useAtom } from 'jotai';
import { ChangeEvent, PropsWithChildren, useCallback, useMemo, useState } from 'react';
import { ExternalLinkIcon, ResetIcon, RocketIcon } from '@radix-ui/react-icons';
import { useRedirectModal } from '@/components/RedirectModalContext/RedirectModalContext';

export function Frame() {
  const [results] = useAtom(frameResultsAtom);

  if (results.length === 0) {
    return <PlaceholderFrame />;
  }

  const latestFrame = results[results.length - 1];

  if (!latestFrame.isValid) {
    return <ErrorFrame />;
  }

  return <ValidFrame tags={latestFrame.tags} />;
}

function ValidFrame({ tags }: { tags: Record<string, string> }) {
  const [inputText, setInputText] = useState('');
  const { image, imageAspectRatioClassname, input, buttons } = useMemo(() => {
    const image = tags['fc:frame:image'];
    const imageAspectRatioClassname =
      tags['fc:frame:image:aspect_ratio'] === '1:1' ? 'aspect-square' : 'aspect-[1.91/1]';
    const input = tags['fc:frame:input:text'];
    // TODO: when debugger is live we will also need to extract actions, etc.
    const buttons = [1, 2, 3, 4].map((index) => {
      const key = `fc:frame:button:${index}`;
      const actionKey = `${key}:action`;
      const targetKey = `${key}:target`;
      const value = tags[key];
      const action = tags[actionKey] || 'post';
      const target = tags[targetKey] || tags['fc:frame:post_url'];

      // If value exists, we can return the whole object (incl. default values).
      // If it doesn't, then the truth is there is no button.
      return value ? { key, value, action, target, index } : undefined;
    });
    return {
      image,
      imageAspectRatioClassname,
      input,
      buttons,
    };
  }, [tags]);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setInputText(e.target.value),
    [],
  );

  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={`w-full rounded-t-xl ${imageAspectRatioClassname} object-cover`}
        src={image}
        alt=""
      />
      <div className="bg-button-gutter-light dark:bg-content-light flex flex-col gap-2 rounded-b-xl px-4 py-2">
        {!!input && (
          <input
            className="bg-input-light border-light rounded-lg border p-2 text-black"
            type="text"
            placeholder={input}
            onChange={handleInputChange}
          />
        )}
        <div className="flex flex-wrap gap-4">
          {buttons.map((button) =>
            button ? (
              <FrameButton inputText={inputText} key={button.key} button={button}>
                {button.value}
              </FrameButton>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorFrame() {
  // TODO: implement -- decide how to handle
  // - simply show an error?
  // - best effort rendering of what they do have?
  return <PlaceholderFrame />;
}

function PlaceholderFrame() {
  return (
    <div className="flex flex-col">
      <div className="bg-farcaster flex aspect-[1.91/1] w-full rounded-t-xl"></div>
      <div className="bg-button-gutter-light dark:bg-content-light flex flex-wrap gap-2 rounded-b-xl px-4 py-2">
        <FrameButton inputText="">Get Started</FrameButton>
      </div>
    </div>
  );
}

function FrameButton({
  children,
  button,
  inputText,
}: PropsWithChildren<{
  // TODO: this type should probably be extracted
  button?: { key: string; value: string; action: string; target: string; index: number };
  inputText: string;
}>) {
  const { openModal } = useRedirectModal();
  const [isLoading, setIsLoading] = useState(false);
  const [_, setResults] = useAtom(frameResultsAtom);

  const handleClick = useCallback(async () => {
    if (button?.action === 'post' || button?.action === 'post_redirect') {
      // TODO: collect user options (follow, like, etc.) and include
      const confirmAction = async () => {
        const result = await postFrame({
          buttonIndex: button.index,
          url: button.target,
          // TODO: make these user-input-driven
          castId: {
            fid: 0,
            hash: '0xthisisnotreal',
          },
          inputText,
          fid: 0,
          messageHash: '0xthisisnotreal',
          network: 0,
          timestamp: 0,
        });
        // TODO: handle when result is not defined
        if (result) {
          setResults((prev) => [...prev, result]);
        }
      };
      setIsLoading(true);
      if (button?.action === 'post_redirect') {
        openModal(confirmAction);
      } else {
        confirmAction();
      }
      setIsLoading(false);
      return;
    } else if (button?.action === 'link') {
      const onConfirm = () => window.open(button.target, '_blank');
      openModal(onConfirm);
    }
    // TODO: implement other actions (mint, etc.)
  }, [button?.action, button?.index, button?.target, inputText, openModal, setResults]);

  const buttonIcon = useMemo(() => {
    switch (button?.action) {
      case 'link':
        return <ExternalLinkIcon />;
      case 'post_redirect':
        return <ResetIcon />;
      case 'mint':
        return <RocketIcon />;
      default:
        null;
    }
  }, [button?.action]);

  return (
    <button
      className="border-button flex w-[45%] grow items-center justify-center gap-1 rounded-lg border bg-white px-4 py-2 text-black"
      type="button"
      onClick={handleClick}
      disabled={isLoading || button?.action === 'mint'}
    >
      <span className="block max-w-[90%] overflow-hidden text-ellipsis whitespace-nowrap">
        {children}
      </span>
      {buttonIcon}
    </button>
  );
}
