<template>
  <v-dialog
    v-model="isShown"
    fullscreen
    hide-overlay
    transition="dialog-bottom-transition"
    scrollable
    width="800"
  >
    <v-card>
      <v-toolbar
        class="flex-1 flex-grow-0 moveable"
        tabs
        color="green en"
      >
        <v-toolbar-title class="text-white">
          {{ t('modpack.export') }}
        </v-toolbar-title>

        <v-spacer />
        <v-btn
          class="non-moveable"
          icon
          @click="cancel"
        >
          <v-icon>arrow_drop_down</v-icon>
        </v-btn>
      </v-toolbar>
      <div
        class="max-h-[100vh] visible-scroll mx-0 justify-center items-center overflow-y-auto overflow-x-hidden px-6 py-2"
      >
        <v-subheader>{{ t('modpack.general') }}</v-subheader>
        <v-container
          grid-list-md
          style="padding-top: 0px"
        >
          <v-layout row>
            <v-flex d-flex>
              <v-text-field
                v-model="name"
                prepend-inner-icon="edit"
                persistent-hint
                :hint="t('instance.nameHint')"
                :label="t('name')"
                required
              />
            </v-flex>
            <v-flex d-flex>
              <v-text-field
                v-model="author"
                prepend-inner-icon="person"
                persistent-hint
                :hint="t('modpack.authorHint')"
                :label="t('author')"
                required
              />
            </v-flex>
          </v-layout>
          <v-layout row>
            <v-flex d-flex>
              <v-text-field
                v-model="data.version"
                prepend-inner-icon="history"
                persistent-hint
                :hint="t('modpack.modpackVersion')"
                :label="t('modpack.modpackVersion')"
                required
              />
            </v-flex>
            <v-flex
              d-flex
              xs6
            >
              <v-select
                v-model="data.gameVersion"
                :items="localVersions"
                prepend-inner-icon="games"
                persistent-hint
                class="visible-scroll"
                :hint="$tc('instance.includeVersion', 2)"
                :label="t('instance.gameVersion')"
                required
              />
            </v-flex>
          </v-layout>
          <v-layout
            row
          >
            <v-flex d-flex>
              <v-checkbox
                v-model="data.emitCurseforge"
                :label="t('modpack.emitCurseforge')"
                prepend-icon="$vuetify.icons.curseforge"
                hide-details
              />
            </v-flex>
            <v-flex
              d-flex
              xs6
            >
              <v-checkbox
                v-model="data.emitMcbbs"
                :label="t('modpack.emitMcbbs')"
                hide-details
              />
            </v-flex>
          </v-layout>
          <v-layout
            row
          >
            <v-flex d-flex>
              <v-checkbox
                v-model="data.emitModrinth"
                :label="t('modpack.emitModrinth')"
                hide-details
                prepend-icon="$vuetify.icons.modrinth"
              />
            </v-flex>
            <v-flex
              d-flex
              xs6
            >
              <!-- <v-checkbox
                v-model="data.emitMcbbs"
                :label="t('modpack.emitMcbbs')"
                hide-details
              /> -->
            </v-flex>
          </v-layout>
          <v-layout
            v-if="!(data.emitCurseforge || data.emitMcbbs || data.emitModrinth)"
            row
          >
            <v-flex d-flex>
              <v-checkbox
                v-model="data.includeAssets"
                :label="t('modpack.includeAssets')"
                prepend-icon="texture"
                hide-details
              />
            </v-flex>
            <v-flex
              d-flex
              xs6
            >
              <v-checkbox
                v-model="data.includeLibraries"
                :label="t('modpack.includeLibraries')"
                prepend-icon="camera_roll"
                hide-details
              />
            </v-flex>
          </v-layout>
        </v-container>

        <v-layout class="items-center">
          <v-subheader v-if="data.emitCurseforge || data.emitMcbbs">
            {{ t('modpack.overrides') }}
          </v-subheader>
          <v-subheader v-else>
            {{ t('modpack.includes') }}
          </v-subheader>
          <div class="flex-grow" />
          <v-text-field
            v-model="filterText"
            prepend-inner-icon="search"
            class="max-w-50"
            :label="t('filter')"
          />
        </v-layout>
        <v-layout
          row
          style="padding: 5px; margin-bottom: 5px"
        >
          <v-skeleton-loader
            v-if="refreshing"
            type="list-item-avatar-two-line, list-item-avatar-two-line, list-item-avatar-two-line, list-item-avatar-two-line"
          />
          <instance-manifest-file-tree
            v-model="data.selected"
            selectable
            :search="filterText"
            :multiple="false"
          >
            <template #default="{ item, selected }">
              <v-tooltip
                v-if="item.data && item.data.canExport && selected && data.emitModrinth"
                left
                color="green"
              >
                <template #activator="{ on }">
                  <v-chip
                    v-if="item.data && item.data.canExport && selected && data.emitModrinth"
                    color="green"
                    label
                    outlined
                    :close="!!item.data.client"
                    v-on="on"
                    @click:close="item.data.client = ''"
                    @click="item.data.client = nextEnv(item.data.client)"
                  >
                    <v-avatar
                      left
                    >
                      C
                    </v-avatar>
                    {{ getEnvText(item.data.client) }}
                  </v-chip>
                </template>
                {{ t('modrinth.environments.client') }}
              </v-tooltip>
              <v-tooltip
                v-if="item.data && item.data.canExport && selected && data.emitModrinth"
                top
                color="blue"
              >
                <template #activator="{ on }">
                  <v-chip
                    v-if="item.data && item.data.canExport && selected && data.emitModrinth"
                    color="blue"
                    label
                    outlined
                    :close="!!item.data.server"
                    v-on="on"
                    @click:close="item.data.server = ''"
                    @click="item.data.server = nextEnv(item.data.server)"
                  >
                    <v-avatar
                      left
                    >
                      S
                    </v-avatar>
                    {{ getEnvText(item.data.server) }}
                  </v-chip>
                </template>
                {{ t('modrinth.environments.server') }}
              </v-tooltip>
            </template>
          </instance-manifest-file-tree>
        </v-layout>
      </div>
      <v-card-actions class="gap-5 items-baseline">
        <v-btn
          text
          large
          :disabled="exporting || refreshing"
          @click="cancel"
        >
          {{ t('cancel') }}
        </v-btn>
        <v-spacer />
        <div class="flex items-center justify-center text-center text-gray-500 flex-shrink flex-grow-0 text-sm">
          ~{{ getExpectedSize(totalSize) }}
        </div>
        <v-btn
          text
          color="primary"
          large
          :loading="exporting || refreshing"
          @click="confirm"
        >
          {{ t('modpack.export') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang=ts setup>
import { InstanceIOServiceKey, InstanceFile, ModpackServiceKey, ExportFileDirective } from '@xmcl/runtime-api'
import { inc } from 'semver'
import { useDialog, useZipFilter } from '../composables/dialog'
import { useInstance, useInstanceVersion } from '../composables/instance'
import { AppExportDialogKey } from '../composables/instanceExport'
import { InstanceFileExportData, provideFileNodes, useInstanceFileNodesFromLocal } from '../composables/instanceFiles'
import { useLocalVersions } from '../composables/version'
import { useI18n, useRefreshable, useService } from '/@/composables'
import { getExpectedSize } from '/@/util/size'
import InstanceManifestFileTree from '../components/InstanceManifestFileTree.vue'

const { isShown, hide: cancel } = useDialog(AppExportDialogKey)
const { getInstanceManifest, exportInstance } = useService(InstanceIOServiceKey)
const { exportModpack } = useService(ModpackServiceKey)
const { showSaveDialog } = windowController
const { t } = useI18n()

// base data
const { folder } = useInstanceVersion()
const { localVersions: _locals } = useLocalVersions()
const { name, author, modpackVersion } = useInstance()
const zipFilter = useZipFilter()
const baseVersion = modpackVersion.value || '0.0.0'
const localVersions = computed(() => _locals.value.map((v) => v.id))

function getEnvText(env: string) {
  if (env === 'required') return t('modrinth.environments.required')
  if (env === 'optional') return t('modrinth.environments.optional')
  if (env === 'unsupported') return t('modrinth.environments.unsupported')
  return t('modrinth.environments.default')
}

function nextEnv(env: string) {
  if (env === 'required') return 'optional'
  if (env === 'optional') return 'unsupported'
  return 'required'
}

const filterText = ref('')
const data = reactive({
  name: name.value,
  author: author.value,
  version: inc(baseVersion, 'patch') ?? '0.0.1',
  gameVersion: folder.value,
  selected: [] as string[],
  fileApi: '',
  files: [] as InstanceFile[],
  includeLibraries: false,
  includeAssets: false,
  emitCurseforge: false,
  emitModrinth: true,
  emitMcbbs: false,
})

const enableCurseforge = computed(() => data.emitCurseforge || data.emitMcbbs)
const enableModrinth = computed(() => data.emitModrinth)

watch(enableModrinth, (v) => {
  if (v) {
    data.emitCurseforge = false
    data.emitMcbbs = false
  }
})

watch(enableCurseforge, (v) => {
  if (v) {
    data.emitModrinth = false
  }
})

function getChoices(data: InstanceFileExportData) {
  const result = [] as Array<{ value: string; text: string }>
  if (data.curseforge && enableCurseforge.value) {
    result.push({ value: 'curseforge', text: t('exportModpackTarget.curseforge') })
  }
  if (data.modrinth && enableModrinth.value) {
    result.push({ value: 'modrinth', text: t('exportModpackTarget.modrinth') })
  }
  if (result.length > 0) {
    result.unshift({ value: '', text: t('exportModpackTarget.override') })
  }
  return result
}

const { leaves } = provideFileNodes(useInstanceFileNodesFromLocal(computed(() => data.files), reactive({
  curseforge: enableCurseforge,
  modrinth: enableModrinth,
})))

function reset() {
  data.includeAssets = false
  data.includeLibraries = false
  data.name = name.value
  data.author = author.value
  data.files = []
  data.selected = []
  data.gameVersion = folder.value ?? ''
  data.version = inc(modpackVersion.value || '0.0.0', 'patch') ?? '0.0.1'
}

// loading
const { refresh, refreshing } = useRefreshable(async () => {
  const manifest = await getInstanceManifest()
  const files = manifest.files
  let selected = [] as string[]
  selected = files
    .filter(file => !file.path.startsWith('.'))
    .filter(file => !file.path.startsWith('logs'))
    .filter(file => !file.path.startsWith('crash-reports'))
    .filter(file => !file.path.startsWith('saves'))
    .filter(file => !file.path.startsWith('resourcepacks'))
    .map(file => file.path)
  nextTick().then(() => { data.selected = selected })
  data.files = files
})

// selecting & directives
const selectedPaths = computed(() => new Set(data.selected))

const exportFiles = computed(() => {
  const selected = selectedPaths.value
  const result: ExportFileDirective[] = leaves.value
    .filter(n => selected.has(n.id))
    .map(l => ({
      path: l.id,
      env: l.data
        ? {
          client: l.data.client,
          server: l.data.server,
        }
        : undefined,
    }) as ExportFileDirective)
  return result
})

const totalSize = computed(() => {
  const existed = selectedPaths.value
  const discount = new Set(exportFiles.value.map(v => v.path))
  return leaves.value.filter(n => existed.has(n.id))
    .filter(n => !discount.has(n.id))
    .map(l => l.size)
    .reduce((a, b) => a + b, 0)
})

// export
const { refresh: confirm, refreshing: exporting } = useRefreshable(async () => {
  const { filePath } = await showSaveDialog({
    title: t('modpack.export'),
    defaultPath: `${data.name}-${data.version}`,
    filters: [zipFilter],
  })
  if (filePath) {
    if (data.emitCurseforge || data.emitMcbbs || data.emitModrinth) {
      try {
        await exportModpack({
          name: data.name,
          files: exportFiles.value,
          author: data.author,
          version: data.version,
          gameVersion: data.gameVersion,
          destinationPath: filePath,
          emitCurseforge: data.emitCurseforge,
          emitMcbbs: data.emitMcbbs,
          emitModrinth: data.emitModrinth,
        })
      } catch (e) {
        console.error(e)
      }
    } else {
      const files = data.selected.filter(p => !!data.files.find(f => f.path === p))
      await exportInstance({
        destinationPath: filePath,
        includeLibraries: data.includeLibraries,
        includeAssets: data.includeAssets,
        files,
      })
    }
  }
  cancel()
})

watch(isShown, (value) => {
  if (value) {
    reset()
    refresh()
  }
})
</script>
