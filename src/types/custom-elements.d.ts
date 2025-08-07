
declare namespace JSX {
  interface IntrinsicElements {
    'vturb-smartplayer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      id?: string;
      style?: React.CSSProperties;
    };
  }
}
