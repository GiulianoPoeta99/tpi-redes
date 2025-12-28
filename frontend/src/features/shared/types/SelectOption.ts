/**
 * Option for SelectInput.
 *
 * @property value - The unique value of the option.
 * @property label - The display label for the option.
 * @property disabled - Whether the option is selectable.
 */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
