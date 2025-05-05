export const bindingsByPlatformAndArch = {
  android: {
    arm: { base: 'android-arm-eabi' },
    arm64: { base: 'android-arm64' }
  },
  darwin: {
    arm64: { base: 'darwin-arm64' },
    x64: { base: 'darwin-x64' }
  },
  freebsd: {
    arm64: { base: 'freebsd-arm64' },
    x64: { base: 'freebsd-x64' }
  },
  linux: {
    arm: { base: 'linux-arm-gnueabihf', musl: 'linux-arm-musleabihf' },
    arm64: { base: 'linux-arm64-gnu', musl: 'linux-arm64-musl' },
    loong64: { base: 'linux-loongarch64-gnu', musl: null },
    ppc64: { base: 'linux-powerpc64le-gnu', musl: null },
    riscv64: { base: 'linux-riscv64-gnu', musl: 'linux-riscv64-musl' },
    s390x: { base: 'linux-s390x-gnu', musl: null },
    x64: { base: 'linux-x64-gnu', musl: 'linux-x64-musl' }
  },
  win32: {
    arm64: { base: 'win32-arm64-msvc' },
    ia32: { base: 'win32-ia32-msvc' },
    x64: { base: 'win32-x64-msvc' }
  }
};