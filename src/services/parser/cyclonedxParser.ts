/**
 * CycloneDX 1.4 パーサー
 * CycloneDX フォーマット（JSON）を UnifiedSBOM に変換する
 */

import type {
  UnifiedSBOM,
  SBOMMetadata,
  Component,
  ComponentType,
  ComponentLicense,
  Relationship,
  Creator,
  Hash,
  HashAlgorithm,
  ExternalRef,
  OrganizationalEntity,
  Property,
  BomLicense,
  SWID,
  Pedigree,
  ReleaseNotes,
  CycloneDXScope,
} from '../../types/unified';
import { v4 as uuidv4 } from 'uuid';

/**
 * CycloneDX BOM ドキュメント型定義（JSON 形式）
 */
interface CycloneDXBom {
  bomFormat?: string;
  specVersion?: string;
  serialNumber?: string;
  version?: number;
  metadata?: CycloneDXMetadata;
  components?: CycloneDXComponent[];
  services?: CycloneDXService[];
  dependencies?: CycloneDXDependency[];
  compositions?: unknown[];
  vulnerabilities?: unknown[];
}

interface CycloneDXMetadata {
  timestamp?: string;
  tools?: CycloneDXTool[];
  authors?: CycloneDXOrganizationalContact[];
  component?: CycloneDXComponent;
  supplier?: CycloneDXOrganizationalEntity;
  licenses?: CycloneDXLicense[];
  properties?: CycloneDXProperty[];
}

interface CycloneDXTool {
  vendor?: string;
  name?: string;
  version?: string;
  hashes?: CycloneDXHash[];
  externalReferences?: CycloneDXExternalReference[];
}

interface CycloneDXOrganizationalContact {
  name?: string;
  email?: string;
  phone?: string;
}

interface CycloneDXOrganizationalEntity {
  name?: string;
  url?: string[];
  contact?: CycloneDXOrganizationalContact[];
}

interface CycloneDXLicense {
  license?: {
    id?: string;
    name?: string;
    text?: {
      content?: string;
      contentType?: string;
      encoding?: string;
    };
    url?: string;
  };
  expression?: string;
}

interface CycloneDXProperty {
  name?: string;
  value?: string;
}

interface CycloneDXComponent {
  type?: string;
  'bom-ref'?: string;
  name?: string;
  version?: string;
  group?: string;
  purl?: string;
  cpe?: string;
  swid?: CycloneDXSwid;
  supplier?: CycloneDXOrganizationalEntity;
  author?: string;
  publisher?: string;
  description?: string;
  scope?: CycloneDXScope;
  hashes?: CycloneDXHash[];
  licenses?: CycloneDXLicense[];
  copyright?: string;
  externalReferences?: CycloneDXExternalReference[];
  components?: CycloneDXComponent[];
  pedigree?: CycloneDXPedigree;
  releaseNotes?: CycloneDXReleaseNotes;
  properties?: CycloneDXProperty[];
}

interface CycloneDXHash {
  alg?: string;
  content?: string;
}

interface CycloneDXExternalReference {
  type?: string;
  url?: string;
  comment?: string;
  hashes?: CycloneDXHash[];
}

interface CycloneDXSwid {
  tagId?: string;
  name?: string;
  version?: string;
  tagVersion?: number;
  patch?: boolean;
}

interface CycloneDXPedigree {
  ancestors?: CycloneDXComponent[];
  descendants?: CycloneDXComponent[];
  notes?: string;
}

interface CycloneDXReleaseNotes {
  type?: string;
  title?: string;
  description?: string;
  timestamp?: string;
}

interface CycloneDXDependency {
  ref?: string;
  dependsOn?: string[];
}

interface CycloneDXService {
  'bom-ref'?: string;
  name?: string;
  version?: string;
  // その他のサービス属性は省略
}

/**
 * CycloneDX JSON をパースして UnifiedSBOM に変換する
 */
export function parseCycloneDXJSON(jsonString: string): UnifiedSBOM {
  const cdxBom = JSON.parse(jsonString) as CycloneDXBom;
  return convertCycloneDXToUnified(cdxBom);
}

/**
 * CycloneDX XML をパースして UnifiedSBOM に変換する
 */
export function parseCycloneDXXML(xmlString: string): UnifiedSBOM {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  // パースエラーチェック
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error(`XML parse error: ${parserError.textContent}`);
  }

  const cdxBom = convertXMLToCycloneDXBom(xmlDoc);
  return convertCycloneDXToUnified(cdxBom);
}

/**
 * XML Document を CycloneDXBom オブジェクトに変換する
 */
function convertXMLToCycloneDXBom(xmlDoc: Document): CycloneDXBom {
  const bomElement = xmlDoc.documentElement;

  // ルート要素の属性を取得
  const bomFormat = bomElement.tagName === 'bom' ? 'CycloneDX' : undefined;
  const specVersion = bomElement.getAttribute('version') ?? undefined;
  const serialNumber = bomElement.getAttribute('serialNumber') ?? undefined;
  const versionAttr = bomElement.getAttribute('version');
  const version = versionAttr ? parseInt(versionAttr, 10) : undefined;

  // metadata の解析
  const metadataElement = bomElement.querySelector(':scope > metadata');
  const metadata = metadataElement ? parseMetadataFromXML(metadataElement) : undefined;

  // components の解析
  const componentsElement = bomElement.querySelector(':scope > components');
  const components = componentsElement ? parseComponentsFromXML(componentsElement) : undefined;

  // dependencies の解析
  const dependenciesElement = bomElement.querySelector(':scope > dependencies');
  const dependencies = dependenciesElement
    ? parseDependenciesFromXML(dependenciesElement)
    : undefined;

  return {
    bomFormat,
    specVersion,
    serialNumber,
    version,
    metadata,
    components,
    dependencies,
  };
}

/**
 * metadata 要素を解析する
 */
function parseMetadataFromXML(metadataElement: Element): CycloneDXMetadata {
  const timestamp = getElementText(metadataElement, 'timestamp');

  // tools の解析
  const toolsElement = metadataElement.querySelector(':scope > tools');
  const tools = toolsElement ? parseToolsFromXML(toolsElement) : undefined;

  // authors の解析
  const authorsElement = metadataElement.querySelector(':scope > authors');
  const authors = authorsElement ? parseAuthorsFromXML(authorsElement) : undefined;

  // component の解析
  const componentElement = metadataElement.querySelector(':scope > component');
  const component = componentElement ? parseComponentFromXML(componentElement) : undefined;

  // supplier の解析
  const supplierElement = metadataElement.querySelector(':scope > supplier');
  const supplier = supplierElement ? parseOrganizationalEntityFromXML(supplierElement) : undefined;

  // licenses の解析
  const licensesElement = metadataElement.querySelector(':scope > licenses');
  const licenses = licensesElement ? parseLicensesFromXML(licensesElement) : undefined;

  // properties の解析
  const propertiesElement = metadataElement.querySelector(':scope > properties');
  const properties = propertiesElement ? parsePropertiesFromXML(propertiesElement) : undefined;

  return {
    timestamp,
    tools,
    authors,
    component,
    supplier,
    licenses,
    properties,
  };
}

/**
 * tools 要素を解析する
 */
function parseToolsFromXML(toolsElement: Element): CycloneDXTool[] {
  const toolElements = toolsElement.querySelectorAll(':scope > tool');
  return Array.from(toolElements).map((toolElement) => ({
    vendor: getElementText(toolElement, 'vendor'),
    name: getElementText(toolElement, 'name'),
    version: getElementText(toolElement, 'version'),
  }));
}

/**
 * authors 要素を解析する
 */
function parseAuthorsFromXML(authorsElement: Element): CycloneDXOrganizationalContact[] {
  const authorElements = authorsElement.querySelectorAll(':scope > author');
  return Array.from(authorElements).map((authorElement) => ({
    name: getElementText(authorElement, 'name'),
    email: getElementText(authorElement, 'email'),
    phone: getElementText(authorElement, 'phone'),
  }));
}

/**
 * component 要素を解析する
 */
function parseComponentFromXML(componentElement: Element): CycloneDXComponent {
  const type = componentElement.getAttribute('type') ?? undefined;
  const bomRef = componentElement.getAttribute('bom-ref') ?? undefined;

  const name = getElementText(componentElement, 'name');
  const version = getElementText(componentElement, 'version');
  const group = getElementText(componentElement, 'group');
  const purl = getElementText(componentElement, 'purl');
  const cpe = getElementText(componentElement, 'cpe');
  const description = getElementText(componentElement, 'description');
  const scope = getElementText(componentElement, 'scope') as CycloneDXScope | undefined;
  const author = getElementText(componentElement, 'author');
  const publisher = getElementText(componentElement, 'publisher');
  const copyright = getElementText(componentElement, 'copyright');

  // hashes の解析
  const hashesElement = componentElement.querySelector(':scope > hashes');
  const hashes = hashesElement ? parseHashesFromXML(hashesElement) : undefined;

  // licenses の解析
  const licensesElement = componentElement.querySelector(':scope > licenses');
  const licenses = licensesElement ? parseLicensesFromXML(licensesElement) : undefined;

  // externalReferences の解析
  const externalReferencesElement = componentElement.querySelector(':scope > externalReferences');
  const externalReferences = externalReferencesElement
    ? parseExternalReferencesFromXML(externalReferencesElement)
    : undefined;

  // properties の解析
  const propertiesElement = componentElement.querySelector(':scope > properties');
  const properties = propertiesElement ? parsePropertiesFromXML(propertiesElement) : undefined;

  // supplier の解析
  const supplierElement = componentElement.querySelector(':scope > supplier');
  const supplier = supplierElement ? parseOrganizationalEntityFromXML(supplierElement) : undefined;

  // 子コンポーネントの解析
  const componentsElement = componentElement.querySelector(':scope > components');
  const components = componentsElement ? parseComponentsFromXML(componentsElement) : undefined;

  return {
    type,
    'bom-ref': bomRef,
    name,
    version,
    group,
    purl,
    cpe,
    description,
    scope,
    author,
    publisher,
    copyright,
    hashes,
    licenses,
    externalReferences,
    properties,
    supplier,
    components,
  };
}

/**
 * components 要素を解析する
 */
function parseComponentsFromXML(componentsElement: Element): CycloneDXComponent[] {
  const componentElements = componentsElement.querySelectorAll(':scope > component');
  return Array.from(componentElements).map(parseComponentFromXML);
}

/**
 * hashes 要素を解析する
 */
function parseHashesFromXML(hashesElement: Element): CycloneDXHash[] {
  const hashElements = hashesElement.querySelectorAll(':scope > hash');
  return Array.from(hashElements).map((hashElement) => ({
    alg: hashElement.getAttribute('alg') ?? undefined,
    content: hashElement.textContent?.trim() ?? undefined,
  }));
}

/**
 * licenses 要素を解析する
 */
function parseLicensesFromXML(licensesElement: Element): CycloneDXLicense[] {
  const licenseElements = licensesElement.querySelectorAll(':scope > license');
  return Array.from(licenseElements).map((licenseElement) => {
    // expression の確認
    const expressionElement = licenseElement.querySelector(':scope > expression');
    if (expressionElement) {
      return {
        expression: expressionElement.textContent?.trim(),
      };
    }

    // license オブジェクトの解析
    const idElement = licenseElement.querySelector(':scope > id');
    const nameElement = licenseElement.querySelector(':scope > name');
    const urlElement = licenseElement.querySelector(':scope > url');
    const textElement = licenseElement.querySelector(':scope > text');

    if (idElement ?? nameElement) {
      return {
        license: {
          id: idElement?.textContent?.trim(),
          name: nameElement?.textContent?.trim(),
          url: urlElement?.textContent?.trim(),
          text: textElement
            ? {
                content: textElement.textContent?.trim(),
                contentType: textElement.getAttribute('content-type') ?? undefined,
                encoding: textElement.getAttribute('encoding') ?? undefined,
              }
            : undefined,
        },
      };
    }

    return {};
  });
}

/**
 * externalReferences 要素を解析する
 */
function parseExternalReferencesFromXML(
  externalReferencesElement: Element
): CycloneDXExternalReference[] {
  const referenceElements = externalReferencesElement.querySelectorAll(':scope > reference');
  return Array.from(referenceElements).map((referenceElement) => ({
    type: referenceElement.getAttribute('type') ?? undefined,
    url: getElementText(referenceElement, 'url'),
    comment: getElementText(referenceElement, 'comment'),
  }));
}

/**
 * properties 要素を解析する
 */
function parsePropertiesFromXML(propertiesElement: Element): CycloneDXProperty[] {
  const propertyElements = propertiesElement.querySelectorAll(':scope > property');
  return Array.from(propertyElements).map((propertyElement) => ({
    name: propertyElement.getAttribute('name') ?? undefined,
    value: propertyElement.textContent?.trim() ?? undefined,
  }));
}

/**
 * OrganizationalEntity を解析する
 */
function parseOrganizationalEntityFromXML(entityElement: Element): CycloneDXOrganizationalEntity {
  const name = getElementText(entityElement, 'name');

  // url の解析（複数可）
  const urlElements = entityElement.querySelectorAll(':scope > url');
  const url =
    urlElements.length > 0
      ? Array.from(urlElements).map((el) => el.textContent?.trim() ?? '')
      : undefined;

  // contact の解析
  const contactElements = entityElement.querySelectorAll(':scope > contact');
  const contact =
    contactElements.length > 0
      ? Array.from(contactElements).map((contactElement) => ({
          name: getElementText(contactElement, 'name'),
          email: getElementText(contactElement, 'email'),
          phone: getElementText(contactElement, 'phone'),
        }))
      : undefined;

  return {
    name,
    url,
    contact,
  };
}

/**
 * dependencies 要素を解析する
 */
function parseDependenciesFromXML(dependenciesElement: Element): CycloneDXDependency[] {
  const dependencyElements = dependenciesElement.querySelectorAll(':scope > dependency');
  return Array.from(dependencyElements).map((dependencyElement) => {
    const ref = dependencyElement.getAttribute('ref') ?? undefined;

    // dependsOn の解析
    const dependsOnElements = dependencyElement.querySelectorAll(':scope > dependency');
    const dependsOn =
      dependsOnElements.length > 0
        ? Array.from(dependsOnElements).map((el) => el.getAttribute('ref') ?? '')
        : undefined;

    return {
      ref,
      dependsOn,
    };
  });
}

/**
 * 要素から子要素のテキストを取得するヘルパー関数
 */
function getElementText(parentElement: Element, childTagName: string): string | undefined {
  const element = parentElement.querySelector(`:scope > ${childTagName}`);
  return element?.textContent?.trim() ?? undefined;
}

/**
 * CycloneDX BOM を UnifiedSBOM に変換する
 */
function convertCycloneDXToUnified(cdxBom: CycloneDXBom): UnifiedSBOM {
  // メタデータの変換
  const metadata = convertMetadata(cdxBom);

  // コンポーネントの変換
  const components = (cdxBom.components ?? []).map((comp) => convertComponentToComponent(comp));

  // 依存関係の変換
  const relationships = convertDependencies(cdxBom.dependencies ?? [], components);

  // 親子関係の設定（dependsOn 関係から）
  setParentChildRelationships(components, relationships);

  return {
    format: 'cyclonedx',
    specVersion: cdxBom.specVersion ?? '1.4',
    metadata,
    components,
    relationships,
    rawSource: cdxBom,
  };
}

/**
 * CycloneDX メタデータを SBOMMetadata に変換する
 */
function convertMetadata(cdxBom: CycloneDXBom): SBOMMetadata {
  const metadata = cdxBom.metadata ?? {};

  // creators の構築（tools + authors）
  const creators: Creator[] = [];

  // tools を Creator に変換
  if (metadata.tools) {
    metadata.tools.forEach((tool) => {
      const name = tool.vendor ? `${tool.vendor} ${tool.name ?? ''}` : (tool.name ?? 'unknown');
      creators.push({
        type: 'tool',
        name: name.trim(),
        version: tool.version,
      });
    });
  }

  // authors を Creator に変換
  if (metadata.authors) {
    metadata.authors.forEach((author) => {
      creators.push({
        type: 'person',
        name: author.name ?? '',
        email: author.email,
      });
    });
  }

  // metadata.component から name を取得（なければ空文字列）
  const name = metadata.component?.name ?? '';

  // BOM レベルのライセンス変換
  const licenses = metadata.licenses ? metadata.licenses.map(convertBomLicense) : undefined;

  // properties の変換
  const properties = metadata.properties ? metadata.properties.map(convertProperty) : undefined;

  return {
    name,
    namespace: cdxBom.serialNumber,
    created: metadata.timestamp,
    creators,
    serialNumber: cdxBom.serialNumber,
    bomVersion: cdxBom.version,
    supplier: metadata.supplier ? convertOrganizationalEntity(metadata.supplier) : undefined,
    licenses,
    properties,
  };
}

/**
 * CycloneDX Component を Component に変換する
 */
function convertComponentToComponent(cdxComp: CycloneDXComponent): Component {
  const id = uuidv4();

  // type の変換（CycloneDX の type は ComponentType と互換性がある）
  const type = normalizeComponentType(cdxComp.type);

  // ライセンス情報の変換
  const licenses = (cdxComp.licenses ?? []).map(convertLicense);

  // ライセンスが1つもない場合は unknown を追加
  if (licenses.length === 0) {
    licenses.push({
      category: 'unknown',
    });
  }

  // ハッシュ値の変換
  const hashes = (cdxComp.hashes ?? []).map(convertHash).filter((h): h is Hash => h !== null);

  // 外部参照の変換
  const externalRefs = (cdxComp.externalReferences ?? []).map(convertExternalReference);

  // properties の変換（cdxProperties として保持）
  const cdxProperties = cdxComp.properties ? cdxComp.properties.map(convertProperty) : undefined;

  // アセンブリコンポーネントの抽出
  const assemblyComponents = cdxComp.components
    ? cdxComp.components.map((c) => c['bom-ref'] ?? '').filter((ref) => ref)
    : undefined;

  return {
    id,
    name: cdxComp.name ?? '',
    version: cdxComp.version,
    type,
    licenses,
    copyrightText: cdxComp.copyright,
    description: cdxComp.description,
    supplier: cdxComp.supplier ? convertOrganizationalEntity(cdxComp.supplier) : undefined,
    hashes,
    externalRefs,
    customAttributes: [], // ユーザー追加のカスタム属性（初期は空）
    parentIds: [],

    // CycloneDX 固有フィールド
    bomRef: cdxComp['bom-ref'],
    group: cdxComp.group,
    purl: cdxComp.purl,
    cpe: cdxComp.cpe,
    scope: cdxComp.scope,
    author: cdxComp.author,
    publisher: cdxComp.publisher,
    assemblyComponents,
    releaseNotes: cdxComp.releaseNotes ? convertReleaseNotes(cdxComp.releaseNotes) : undefined,
    cdxProperties,
    swid: cdxComp.swid ? convertSwid(cdxComp.swid) : undefined,
    pedigree: cdxComp.pedigree ? convertPedigree(cdxComp.pedigree) : undefined,
  };
}

/**
 * CycloneDX type を ComponentType に正規化する
 */
function normalizeComponentType(type?: string): ComponentType {
  if (!type) return 'library';

  const normalized = type.toLowerCase();

  const validTypes: ComponentType[] = [
    'application',
    'framework',
    'library',
    'container',
    'operating-system',
    'device',
    'firmware',
    'file',
    'other',
  ];

  return validTypes.includes(normalized as ComponentType)
    ? (normalized as ComponentType)
    : 'library';
}

/**
 * CycloneDX License を ComponentLicense に変換する
 */
function convertLicense(cdxLicense: CycloneDXLicense): ComponentLicense {
  // expression が優先
  if (cdxLicense.expression) {
    return {
      expression: cdxLicense.expression,
      licenseId: extractSimpleLicenseId(cdxLicense.expression),
      category: 'unknown', // 後でライセンス分類ロジックで更新される
    };
  }

  // license オブジェクトから情報を取得
  if (cdxLicense.license) {
    const lic = cdxLicense.license;
    return {
      licenseId: lic.id,
      licenseName: lic.name,
      url: lic.url,
      text: lic.text?.content,
      category: 'unknown',
    };
  }

  // どちらもない場合は unknown
  return {
    category: 'unknown',
  };
}

/**
 * License Expression から単純なライセンス ID を抽出する
 * 例: "MIT" → "MIT", "MIT OR Apache-2.0" → undefined（複雑な式）
 */
function extractSimpleLicenseId(expression: string): string | undefined {
  // 単純なライセンス ID の場合のみ返す（OR, AND, WITH などを含まない）
  if (!/\s+(OR|AND|WITH)\s+/i.test(expression)) {
    return expression.trim();
  }
  return undefined;
}

/**
 * CycloneDX Hash を Hash に変換する
 */
function convertHash(cdxHash: CycloneDXHash): Hash | null {
  if (!cdxHash.alg || !cdxHash.content) {
    return null;
  }

  // アルゴリズム名の正規化
  const algorithm = normalizeHashAlgorithm(cdxHash.alg);
  if (!algorithm) {
    return null;
  }

  return {
    algorithm,
    value: cdxHash.content,
  };
}

/**
 * ハッシュアルゴリズム名を正規化する
 */
function normalizeHashAlgorithm(algorithm: string): HashAlgorithm | null {
  // CycloneDX では "SHA-256", "SHA-1" などの形式
  const normalized = algorithm.toUpperCase().replace(/_/g, '-');

  const validAlgorithms: HashAlgorithm[] = [
    'MD5',
    'SHA-1',
    'SHA-256',
    'SHA-384',
    'SHA-512',
    'SHA3-256',
    'SHA3-384',
    'SHA3-512',
    'BLAKE2b-256',
    'BLAKE2b-384',
    'BLAKE2b-512',
    'BLAKE3',
  ];

  // SHA1 → SHA-1, SHA256 → SHA-256 などの変換
  const mappings: Record<string, HashAlgorithm> = {
    SHA1: 'SHA-1',
    'SHA-1': 'SHA-1',
    SHA256: 'SHA-256',
    'SHA-256': 'SHA-256',
    SHA384: 'SHA-384',
    'SHA-384': 'SHA-384',
    SHA512: 'SHA-512',
    'SHA-512': 'SHA-512',
    'SHA3-256': 'SHA3-256',
    'SHA3-384': 'SHA3-384',
    'SHA3-512': 'SHA3-512',
  };

  const mapped = mappings[normalized] ?? normalized;

  return validAlgorithms.includes(mapped) ? mapped : null;
}

/**
 * CycloneDX ExternalReference を ExternalRef に変換する
 */
function convertExternalReference(cdxRef: CycloneDXExternalReference): ExternalRef {
  return {
    category: 'OTHER', // CycloneDX には category がないため OTHER を使用
    type: cdxRef.type ?? '',
    locator: cdxRef.url ?? '',
    comment: cdxRef.comment,
  };
}

/**
 * CycloneDX OrganizationalEntity を OrganizationalEntity に変換する
 */
function convertOrganizationalEntity(
  cdxEntity: CycloneDXOrganizationalEntity
): OrganizationalEntity {
  const email =
    cdxEntity.contact && cdxEntity.contact.length > 0 ? cdxEntity.contact[0].email : undefined;

  return {
    name: cdxEntity.name ?? '',
    email,
    url: cdxEntity.url,
  };
}

/**
 * CycloneDX Property を Property に変換する
 */
function convertProperty(cdxProp: CycloneDXProperty): Property {
  return {
    name: cdxProp.name ?? '',
    value: cdxProp.value ?? '',
    valueType: 'string', // CycloneDX の property は常に string
  };
}

/**
 * CycloneDX BOM License を BomLicense に変換する
 */
function convertBomLicense(cdxLicense: CycloneDXLicense): BomLicense {
  if (cdxLicense.expression) {
    return {
      expression: cdxLicense.expression,
    };
  }

  if (cdxLicense.license) {
    return {
      licenseId: cdxLicense.license.id,
      licenseName: cdxLicense.license.name,
    };
  }

  return {};
}

/**
 * CycloneDX SWID を SWID に変換する
 */
function convertSwid(cdxSwid: CycloneDXSwid): SWID {
  return {
    tagId: cdxSwid.tagId ?? '',
    name: cdxSwid.name ?? '',
    version: cdxSwid.version,
    tagVersion: cdxSwid.tagVersion,
    patch: cdxSwid.patch,
  };
}

/**
 * CycloneDX Pedigree を Pedigree に変換する
 */
function convertPedigree(cdxPedigree: CycloneDXPedigree): Pedigree {
  return {
    ancestors: cdxPedigree.ancestors
      ? cdxPedigree.ancestors.map(convertComponentToComponent)
      : undefined,
    descendants: cdxPedigree.descendants
      ? cdxPedigree.descendants.map(convertComponentToComponent)
      : undefined,
    notes: cdxPedigree.notes,
  };
}

/**
 * CycloneDX ReleaseNotes を ReleaseNotes に変換する
 */
function convertReleaseNotes(cdxReleaseNotes: CycloneDXReleaseNotes): ReleaseNotes {
  return {
    type: cdxReleaseNotes.type ?? '',
    title: cdxReleaseNotes.title,
    description: cdxReleaseNotes.description,
    timestamp: cdxReleaseNotes.timestamp,
  };
}

/**
 * CycloneDX Dependencies を Relationship 配列に変換する
 */
function convertDependencies(
  cdxDependencies: CycloneDXDependency[],
  components: Component[]
): Relationship[] {
  // bomRef → Component.id のマッピングを作成
  const bomRefToId = new Map<string, string>();
  components.forEach((comp) => {
    if (comp.bomRef) {
      bomRefToId.set(comp.bomRef, comp.id);
    }
  });

  const relationships: Relationship[] = [];

  cdxDependencies.forEach((dep) => {
    const sourceId = dep.ref ? bomRefToId.get(dep.ref) : undefined;

    if (sourceId && dep.dependsOn) {
      dep.dependsOn.forEach((targetRef) => {
        const targetId = bomRefToId.get(targetRef);
        if (targetId) {
          relationships.push({
            sourceId,
            targetId,
            type: 'dependsOn',
          });
        }
      });
    }
  });

  return relationships;
}

/**
 * dependsOn 関係から親子関係を設定する
 */
function setParentChildRelationships(components: Component[], relationships: Relationship[]): void {
  // Component.id → Component のマッピング
  const idToComponent = new Map<string, Component>();
  components.forEach((comp) => {
    idToComponent.set(comp.id, comp);
  });

  // dependsOn 関係を処理（sourceId が targetId に依存 = targetId が sourceId の親）
  relationships.forEach((rel) => {
    if (rel.type === 'dependsOn') {
      const child = idToComponent.get(rel.sourceId);
      if (child) {
        if (!child.parentIds.includes(rel.targetId)) {
          child.parentIds.push(rel.targetId);
        }
      }
    }
  });
}
