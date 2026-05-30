export function LauncherMenu<TItem extends string>(props: {
  items: readonly TItem[];
  selectedItem: TItem;
  onSelect: (item: TItem) => void;
}): React.ReactElement {
  return (
    <nav className="launcher-menu">
      {props.items.map((item) => (
        <button
          key={item}
          className="clay-menu-button"
          type="button"
          aria-pressed={props.selectedItem === item}
          onClick={() => props.onSelect(item)}
        >
          {item}
        </button>
      ))}
    </nav>
  );
}

