import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

import {
  InvalidPhotoError,
  parsePhotoFileName,
  photoFileName,
  processPhoto,
  savePhoto,
} from "./photo";

/** Uma foto de celular de mentira: deitada, com orientação e dados no EXIF. */
async function cameraPhoto(width = 1600, height = 1200): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: "#2d8f6f" },
  })
    .jpeg()
    .withMetadata({
      orientation: 6,
      exif: { IFD0: { Copyright: "Câmera de teste", Artist: "Teste" } },
    })
    .toBuffer();
}

const ID = "a".repeat(64);

describe("processPhoto", () => {
  it("gira pela orientação, reduz e grava em WebP sem os metadados da câmera", async () => {
    const { photo, files } = await processPhoto(await cameraPhoto());

    // 1600 × 1200 com orientação 6 fica em pé: 1200 × 1600, reduzido a 720 × 960.
    expect(photo).toMatchObject({ width: 720, height: 960 });
    expect(photo.id).toMatch(/^[0-9a-f]{64}$/);
    for (const [width, data] of files) {
      const meta = await sharp(data).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.height).toBe(width);
      expect(meta.exif).toBeUndefined();
      expect(meta.orientation).toBeUndefined();
    }
  });

  it("dá o mesmo id para a mesma foto e não aumenta uma foto pequena", async () => {
    const small = await cameraPhoto(300, 300);
    const first = await processPhoto(small);
    const second = await processPhoto(small);

    expect(first.photo.id).toBe(second.photo.id);
    expect(first.photo).toMatchObject({ width: 300, height: 300 });
  });

  it("recusa o que não é imagem", async () => {
    await expect(
      processPhoto(Buffer.from("<svg onload=alert(1)>não é foto")),
    ).rejects.toBeInstanceOf(InvalidPhotoError);
  });
});

describe("nomes dos arquivos", () => {
  it("lê só nomes no formato das fotos", () => {
    expect(parsePhotoFileName(photoFileName(ID, 480))).toEqual({
      id: ID,
      width: 480,
    });
    for (const name of [
      "../portfolio.db",
      `${ID}-720.webp`,
      `${ID}-480.png`,
      `${"A".repeat(64)}-480.webp`,
      "abc-480.webp",
      `${ID}-480.webp/x`,
    ]) {
      expect(parsePhotoFileName(name), name).toBeNull();
    }
  });
});

describe("savePhoto", () => {
  let directory = "";

  afterEach(async () => {
    if (directory !== "") {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("grava um arquivo por largura, sem deixar temporário para trás", async () => {
    directory = await mkdtemp(path.join(tmpdir(), "fotos-"));
    const processed = await processPhoto(await cameraPhoto());

    await savePhoto(path.join(directory, "media"), processed);

    expect((await readdir(path.join(directory, "media"))).sort()).toEqual([
      photoFileName(processed.photo.id, 480),
      photoFileName(processed.photo.id, 960),
    ]);
  });
});
