import ForceGraph2D from 'react-force-graph-2d'
import generateGraph from '../../utilities/generateGraph'
import { useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { useMantineTheme } from '@mantine/core'

export default function GraphView({ rawData }) {
  const mouseDown = useRef(false)
  const colors = useMantineTheme().colors

  const screenWidth = window.screen.availWidth
  const screenHeight = window.screen.availHeight + 100

  useEffect(() => {
    function handleMouseDown() {
      mouseDown.current = true
    }
    function handleMouseUp() {
      mouseDown.current = false
    }
    window.addEventListener('mousedown', handleMouseDown, true)
    window.addEventListener('mouseup', handleMouseUp, true)
    return () => {
      window.removeEventListener('mousedown', handleMouseDown, true)
      window.removeEventListener('mouseup', handleMouseUp, true)
    }
  }, [])

  /* Highlight links and nodes on hover */

  const data = useMemo(() => {
    const gData = generateGraph(rawData)

    gData.links.forEach((link) => {
      const a = gData.nodes[link.source]
      const b = gData.nodes[link.target]
      !a.neighbors && (a.neighbors = [])
      !b.neighbors && (b.neighbors = [])
      a.neighbors.push(b)
      b.neighbors.push(a)

      !a.links && (a.links = [])
      !b.links && (b.links = [])
      a.links.push(link)
      b.links.push(link)
    })

    return gData
  }, [rawData])

  const [highlightNodes, setHighlightNodes] = useState(new Set())
  const [highlightLinks, setHighlightLinks] = useState(new Set())
  const setHoverNode = useState(null)[1]

  const updateHighlight = () => {
    setHighlightNodes(highlightNodes)
    setHighlightLinks(highlightLinks)
  }

  const handleNodeHover = (node) => {
    if (!mouseDown.current) {
      highlightNodes.clear()
      highlightLinks.clear()
    }

    if (node) {
      highlightNodes.add(node)
      node.neighbors.forEach((neighbor) => highlightNodes.add(neighbor))
      node.links.forEach((link) => highlightLinks.add(link))
    }

    setHoverNode(node || null)
    updateHighlight()
  }

  const handleNodeDrag = (node) => {
    if (node) {
      highlightNodes.add(node)
      node.neighbors.forEach((neighbor) => highlightNodes.add(neighbor))
      node.links.forEach((link) => highlightLinks.add(link))
    }
  }

  const handleNodeDragEnd = () => {
    highlightNodes.clear()
    highlightLinks.clear()
  }

  const handleLinkHover = (link) => {
    highlightNodes.clear()
    highlightLinks.clear()

    if (link) {
      highlightLinks.add(link)
      highlightNodes.add(link.source)
      highlightNodes.add(link.target)
    }
  }

  /* Autogenerated curves on node repeat */

  let sameNodesLinks = {}
  const curvatureMinMax = 0.5

  data.links.forEach((link) => {
    link.nodePairId =
      link.source <= link.target ? link.source + '_' + link.target : link.target + '_' + link.source
    let map = null
    if (link.source != link.target) {
      map = sameNodesLinks
    }
    if (!map[link.nodePairId]) {
      map[link.nodePairId] = []
    }
    map[link.nodePairId].push(link)
  })

  Object.keys(sameNodesLinks)
    .filter((nodePairId) => sameNodesLinks[nodePairId].length > 1)
    .forEach((nodePairId) => {
      let links = sameNodesLinks[nodePairId]
      let lastIndex = links.length - 1
      let lastLink = links[lastIndex]
      lastLink.curvature = curvatureMinMax
      let delta = (2 * curvatureMinMax) / lastIndex
      for (let i = 0; i < lastIndex; i++) {
        links[i].curvature = -curvatureMinMax + i * delta
        if (lastLink.source !== links[i].source) {
          links[i].curvature *= -1
        }
      }
    })

  return (
    <>
      <ForceGraph2D
        width={screenWidth}
        height={screenHeight}
        graphData={data}
        autoPauseRedraw={false}
        linkCurvature={'curvature'}
        backgroundColor={colors.dark[6]}
        nodeRelSize={3}
        nodeColor={(node) => {
          if (highlightNodes.size > 0) {
            if (highlightNodes.has(node)) {
              return colors.main[0]
            } else if (highlightNodes.neighbors?.has(node)) {
              return colors.main[0]
            } else {
              // #353535
              return colors.dark[5]
            }
          } else {
            // #8a8a8a
            return colors.dark[3]
          }
        }}
        linkColor={(link) => (highlightLinks.has(link) ? colors.main[0] : colors.dark[5])}
        dagMode={'radialin'}
        onNodeHover={handleNodeHover}
        onNodeDrag={handleNodeDrag}
        onNodeDragEnd={handleNodeDragEnd}
        onLinkHover={handleLinkHover}
      />
    </>
  )
}

GraphView.propTypes = {
  rawData: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      tags: PropTypes.arrayOf(PropTypes.string).isRequired
    })
  ).isRequired
}
