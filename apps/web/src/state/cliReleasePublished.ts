import { useAtomValue } from "@effect/atom-react";
import { CLI_RELEASE_CHECKSUMS_FILE, cliReleaseTagApiUrl } from "@t3tools/shared/cliRelease";
import * as Effect from "effect/Effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http";
import { AsyncResult, Atom } from "effect/reactivity";

// A release exists before its CLI archives are attached; the checksum file is
// written last from the uploaded bytes, so its presence means a server can
// download and verify its archive.
function hasCliArchives(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return false;
  const release = body as { readonly draft?: unknown; readonly assets?: unknown };
  if (release.draft === true || !Array.isArray(release.assets)) return false;
  return release.assets.some(
    (asset: unknown) =>
      typeof asset === "object" &&
      asset !== null &&
      (asset as { readonly name?: unknown }).name === CLI_RELEASE_CHECKSUMS_FILE,
  );
}

export const cliReleasePublishedAtom = Atom.family((version: string) =>
  Atom.make(
    Effect.gen(function* () {
      const response = yield* HttpClient.get(cliReleaseTagApiUrl(version), {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (response.status === 404) return false;
      const body = yield* HttpClientResponse.filterStatusOk(response).pipe(
        Effect.flatMap((ok) => ok.json),
      );
      return hasCliArchives(body);
    }).pipe(
      // Tracing headers would make the browser send a CORS preflight the GitHub API rejects.
      Effect.provideService(HttpClient.TracerPropagationEnabled, false),
      Effect.provide(FetchHttpClient.layer),
    ),
  ).pipe(
    Atom.withRefresh("5 minutes"),
    Atom.keepAlive,
    Atom.withLabel(`cli-release-published:${version}`),
  ),
);

const NO_VERSION_ATOM = Atom.make(AsyncResult.success(false)).pipe(
  Atom.withLabel("cli-release-published:none"),
);

export function useCliReleasePublished(version: string | null): boolean {
  const result = useAtomValue(version ? cliReleasePublishedAtom(version) : NO_VERSION_ATOM);
  return AsyncResult.getOrElse(result, () => false);
}
