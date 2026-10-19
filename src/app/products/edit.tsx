import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { FormScreen } from '@/components/form-screen';
import { Field, MultiChoiceChips, Select, SwitchRow, useToast } from '@/components/ui';
import { enumLabel, ProductCategories } from '@/constants/enums';
import { useQuery } from '@/hooks/use-api';
import { request, seg } from '@/lib/api';
import { rows, str, type Row } from '@/lib/format';
import { isHttpsUrl, parseMoney, parseWholeNumber, safeMessage } from '@/lib/security';

export default function ProductEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const product = useQuery<Row>(id ? `/products/${seg(id)}` : null);
  const branches = useQuery<Row[]>('/branches');

  if ((id && product.loading) || branches.loading) {
    return <FormScreen loading onSave={() => {}} saveLabel="" saving={false} title={id ? 'Edit product' : 'New product'}>{null}</FormScreen>;
  }
  if (id && !product.data) {
    return (
      <FormScreen loadError={product.error ?? 'Product not found.'} onRetry={() => void product.refresh()} onSave={() => {}} saveLabel="" saving={false} title="Edit product">
        {null}
      </FormScreen>
    );
  }
  return <ProductForm branches={rows(branches.data)} id={id} initial={product.data} />;
}

function ProductForm({ id, initial, branches }: { id?: string; initial: Row | null; branches: Row[] }) {
  const toast = useToast();
  const branchProduct = rows(initial?.branchProducts)[0];
  const [name, setName] = useState(str(initial?.name));
  const [category, setCategory] = useState<string | null>(str(initial?.category) || null);
  const [price, setPrice] = useState(branchProduct?.salePrice != null ? String(branchProduct.salePrice) : '');
  const [quantity, setQuantity] = useState(branchProduct?.quantity != null ? String(branchProduct.quantity) : '1');
  const [brand, setBrand] = useState(str(initial?.brand));
  const [sku, setSku] = useState(str(initial?.sku));
  const [description, setDescription] = useState(str(initial?.description));
  const [images, setImages] = useState(Array.isArray(initial?.images) ? initial.images.map(str).join('\n') : '');
  const [shippable, setShippable] = useState(initial?.shippable !== false);
  const [branchIds, setBranchIds] = useState<string[]>(() => {
    // Product detail exposes branch IDs via its prices.
    const existing = [...new Set(rows(initial?.prices).map((entry) => str(entry.branchId)).filter(Boolean))];
    if (existing.length) return existing;
    return branches.length === 1 ? [str(branches[0].id)] : [];
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const amount = parseMoney(price);
    const stock = parseWholeNumber(quantity);
    const imageList = images.split(/\s+/).map((value) => value.trim()).filter(Boolean);
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Give this product a name.';
    if (!category) next.category = 'Choose a category.';
    if (amount === null) next.price = 'Enter a price greater than 0.';
    if (stock === null) next.quantity = 'Enter a whole number.';
    if (imageList.length > 10) next.images = 'Up to 10 images.';
    else if (imageList.some((url) => !isHttpsUrl(url))) next.images = 'Image links must start with https://';
    if (!branchIds.length) next.branches = branches.length ? 'Choose at least one location.' : 'Add a location first (Account → Locations).';
    setErrors(next);
    if (Object.keys(next).length) return setFormError('Please fix the highlighted fields.');
    setFormError(null);
    setSaving(true);

    const base = {
      name: name.trim(),
      category,
      images: imageList,
      ...(brand.trim() ? { brand: brand.trim() } : {}),
      ...(sku.trim() ? { sku: sku.trim() } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
    };
    try {
      if (id) {
        await request(`/products/${seg(id)}`, {
          method: 'PATCH',
          body: { ...base, branches: branchIds.map((branchId) => ({ branchId, salePrice: amount, quantity: stock, colors: [] })) },
        });
      } else {
        await request('/products', {
          method: 'POST',
          body: {
            ...base,
            shippable,
            isAvailable: true,
            branches: branchIds.map((branchId) => ({ branchId, reserved: 0, quantity: stock, salePrice: amount, colors: [], isActive: true })),
          },
        });
      }
      toast.success(id ? 'Product updated' : 'Product added');
      router.back();
    } catch (cause) {
      setFormError(safeMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await request(`/products/${seg(id!)}`, { method: 'DELETE' });
      toast.success('Product deleted');
      router.back();
    } catch (cause) {
      setFormError(safeMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen
      deleteLabel={id ? 'Delete product' : undefined}
      error={formError}
      onDelete={id ? () => void remove() : undefined}
      onSave={() => void save()}
      saveLabel={id ? 'Save changes' : 'Add product'}
      saving={saving}
      title={id ? 'Edit product' : 'New product'}>
      <Field error={errors.name} label="Name" onChangeText={setName} value={name} />
      <Field error={errors.price} inputMode="decimal" keyboardType="decimal-pad" label="Price" maxLength={10} onChangeText={setPrice} placeholder="0.00" value={price} />
      <Field error={errors.quantity} keyboardType="number-pad" label="In stock" maxLength={7} onChangeText={setQuantity} value={quantity} />
      <Select
        error={errors.category}
        label="Category"
        onChange={setCategory}
        options={ProductCategories.map((value) => ({ value, label: enumLabel(value) }))}
        value={category}
      />
      {branches.length > 1 || errors.branches ? (
        <MultiChoiceChips
          error={errors.branches}
          label="Sold at"
          onChange={setBranchIds}
          options={branches.map((branch) => ({ value: str(branch.id), label: str(branch.name) }))}
          values={branchIds}
        />
      ) : null}
      {!id ? <SwitchRow detail="Customers can get it delivered" label="Ships" onChange={setShippable} value={shippable} /> : null}
      <Field label="Brand" onChangeText={setBrand} placeholder="Optional" value={brand} />
      <Field autoCapitalize="characters" label="SKU" maxLength={80} onChangeText={setSku} placeholder="Optional" value={sku} />
      <Field label="Description" maxLength={2000} multiline onChangeText={setDescription} placeholder="Optional" value={description} />
      <Field
        autoCapitalize="none"
        autoCorrect={false}
        error={errors.images}
        hint="Optional · one https:// link per line, up to 10"
        keyboardType="url"
        label="Photo links"
        maxLength={10 * 2048}
        multiline
        onChangeText={setImages}
        value={images}
      />
    </FormScreen>
  );
}
