// Node's ESM resolver requires explicit file extensions and cannot see the
// extensionless relative imports that src/ uses by convention (see tsconfig
// `allowImportingTsExtensions`/`include: ["src"]`). This hook lets
// verify_rig_geometry.mjs load src/rig/scene.ts as plain TypeScript: it only
// retries a failed relative resolution by appending `.ts`, nothing else.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context)
  } catch (error) {
    const isBareRelative = specifier.startsWith('.') && !/\.[cm]?[jt]sx?$/.test(specifier)
    if (error?.code === 'ERR_MODULE_NOT_FOUND' && isBareRelative) {
      return nextResolve(`${specifier}.ts`, context)
    }
    throw error
  }
}
