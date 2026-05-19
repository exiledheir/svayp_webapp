import React, { useState } from 'react';

interface Props {
  onEmojiSelect: (emoji: string) => void;
}

const CATEGORIES: { icon: string; name: string }[] = [
  { icon: '😊', name: 'Smileys' },
  { icon: '👋', name: 'Gestures' },
  { icon: '🐶', name: 'Animals' },
  { icon: '🍎', name: 'Food' },
  { icon: '✈️', name: 'Travel' },
  { icon: '⚽', name: 'Sports' },
  { icon: '💡', name: 'Objects' },
  { icon: '❤️', name: 'Symbols' },
];

const EMOJIS_BY_CATEGORY: Record<string, string[]> = {
  Smileys: [
    '😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','😉',
    '😍','🥰','😘','😗','😋','😜','🤪','😝','😎','🥳','🤩',
    '😮','😯','😱','😳','😢','😭','😤','😠','😡','🤯','🥺',
    '😐','😑','🙄','😏','😒','😔','😪','🤤','😴','🥱','😷',
  ],
  Gestures: [
    '👋','🤚','🖐','✋','🖖','👌','🤌','✌️','🤞','🤟','🤘',
    '🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛',
    '🤜','👏','🙌','🫶','🤝','🙏','💪','🦵','🦶','💅','🤳',
  ],
  Animals: [
    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁',
    '🐮','🐷','🐸','🐵','🙈','🙉','🙊','🦄','🦓','🐔','🐧',
    '🦆','🦅','🦉','🦇','🐺','🐗','🐴','🐝','🦋','🐢','🐊',
  ],
  Food: [
    '🍎','🍊','🍋','🍇','🍓','🫐','🍉','🍑','🥭','🍍','🥥',
    '🍅','🫒','🥑','🍆','🥦','🌽','🥕','🍄','🍕','🍔','🌮',
    '🌯','🥗','🍜','🍣','🍱','🍦','🍰','🎂','🍫','🍬','☕',
    '🍵','🧋','🍺','🍻','🥂',
  ],
  Travel: [
    '✈️','🚀','🛸','🚁','🚂','🚗','🚕','🚙','🚌','🏎️','🏍️',
    '🛵','🚲','⛵','🛳️','🏖️','🏝️','⛺','🌋','🏔️','🗻','🌃',
    '🌆','🏙️','🗽','🗼','🏰','🗺️','🧭','🌍','🌎','🌏',
  ],
  Sports: [
    '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓',
    '🏸','🥊','🥋','🎽','⛷️','🏂','🤸','⛹️','🤺','🤼','🤾',
    '🏋️','🚴','🧘','🏊','🏄','🎯','🎮','🎲',
  ],
  Objects: [
    '💼','👜','👛','👓','🕶️','💍','💎','💰','💳','💡','🔦',
    '📱','💻','🖥️','🎮','📷','🎵','🎶','🎸','🎹','🎤','🎧',
    '📚','✏️','📝','🔑','🗝️','🔒','🔓','🔨','🪄','🧲','🔭',
  ],
  Symbols: [
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥',
    '💕','💞','💓','💗','💖','💘','💝','⭐','🌟','✨','💫',
    '🌙','☀️','⛅','🌈','⚡','🔥','💧','🌊','🌸','🌺','🌻',
    '🌹','🍀','🎉','🎊','🏆','🎁',
  ],
};

export default function ChatEmojiPanel({ onEmojiSelect }: Props) {
  const [activeCat, setActiveCat] = useState(0);
  const emojis = EMOJIS_BY_CATEGORY[CATEGORIES[activeCat].name] ?? [];

  return (
    <div className="w-full bg-white border-t border-gray-100" style={{ height: 260 }}>
      {/* Category tabs */}
      <div className="flex border-b border-gray-100 overflow-x-auto hide-scrollbar">
        {CATEGORIES.map((cat, i) => (
          <button
            key={cat.name}
            onClick={() => setActiveCat(i)}
            className={`flex-shrink-0 w-10 h-10 flex items-center justify-center text-lg transition-colors ${
              activeCat === i ? 'border-b-2 border-black' : ''
            }`}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div
        className="grid overflow-y-auto p-2"
        style={{ gridTemplateColumns: 'repeat(8, 1fr)', height: 216 }}
      >
        {emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onEmojiSelect(emoji)}
            className="flex items-center justify-center text-[22px] h-9 rounded-lg active:bg-gray-100 transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
